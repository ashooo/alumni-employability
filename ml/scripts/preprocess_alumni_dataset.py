from pathlib import Path
import pandas as pd


SUFFIXES = {"JR", "JR.", "SR", "SR.", "II", "III", "IV", "V"}


def parse_name(full_name: str):
    text = str(full_name or "").strip()
    if not text:
        return {
            "first_name": "",
            "middle_name": "",
            "last_name": "",
            "suffix": "",
        }

    parts = [p.strip() for p in text.split(",") if p.strip()]
    if len(parts) < 2:
        tokens = text.split()
        if len(tokens) == 1:
            return {
                "first_name": tokens[0],
                "middle_name": "",
                "last_name": "",
                "suffix": "",
            }
        return {
            "first_name": " ".join(tokens[:-1]),
            "middle_name": "",
            "last_name": tokens[-1],
            "suffix": "",
        }

    last_name = parts[0]
    given_tokens = " ".join(parts[1:]).split()
    suffix = ""
    middle_name = ""

    if given_tokens and pd.notna(given_tokens[-1]) and len(given_tokens[-1]) <= 3:
        token = given_tokens[-1].replace(".", "")
        if len(token) == 1 and token.isalpha():
            middle_name = token.upper()
            given_tokens.pop()

    if given_tokens:
        maybe_suffix = given_tokens[-1].upper()
        if maybe_suffix in SUFFIXES:
            suffix = given_tokens[-1]
            given_tokens.pop()

    if not middle_name and given_tokens and len(given_tokens[-1]) <= 3:
        token = given_tokens[-1].replace(".", "")
        if len(token) == 1 and token.isalpha():
            middle_name = token.upper()
            given_tokens.pop()

    first_name = " ".join(given_tokens).strip()
    return {
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "suffix": suffix,
    }


def main():
    root = Path(__file__).resolve().parents[2]
    src = root / "ml" / "data" / "final_alumni_program_.xlsx"
    dst = root / "ml" / "data" / "final_alumni_program_preprocessed.xlsx"

    wb = pd.ExcelFile(src)
    sheets = {}
    for sheet_name in wb.sheet_names:
        df = wb.parse(sheet_name)
        if sheet_name == "Alumni Data" and "Name" in df.columns:
            parsed = df["Name"].apply(parse_name).apply(pd.Series)
            for col in ["first_name", "middle_name", "last_name", "suffix"]:
                df[col] = parsed[col]
        sheets[sheet_name] = df

    with pd.ExcelWriter(dst, engine="openpyxl") as writer:
        for sheet_name, df in sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"Preprocessed dataset written to: {dst}")


if __name__ == "__main__":
    main()

