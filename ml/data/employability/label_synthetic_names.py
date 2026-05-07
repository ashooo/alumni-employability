#!/usr/bin/env python3
from __future__ import annotations

import csv
from pathlib import Path
import random

SYNTHETIC_FIRST_NAMES = [
    'Adrian', 'Aileen', 'Aira', 'Albert', 'Aldrin', 'Alexa', 'Alexis', 'Allen', 'Alvin', 'Amanda',
    'Andrea', 'Angela', 'Angelica', 'Anthony', 'Aris', 'Arthur', 'Ashley', 'Audrey', 'Ava', 'Bea',
    'Beatrice', 'Benjamin', 'Bianca', 'Brandon', 'Bryan', 'Camille', 'Carla', 'Carlo', 'Catherine', 'Cedric',
    'Charlene', 'Charles', 'Chester', 'Chloe', 'Christian', 'Christine', 'Claire', 'Clarisse', 'Coleen', 'Daisy',
    'Daniel', 'Danielle', 'Daphne', 'Darren', 'David', 'Denise', 'Derrick', 'Diana', 'Dominic', 'Donna',
    'Dwayne', 'Elaine', 'Elijah', 'Eliza', 'Ella', 'Emerson', 'Emmanuel', 'Enzo', 'Erica', 'Erika',
    'Ethan', 'Eugene', 'Faith', 'Felix', 'Frances', 'Franco', 'Franz', 'Gabriel', 'Gail', 'Gavin',
    'Gelo', 'Gene', 'Geoffrey', 'Gian', 'Gina', 'Grace', 'Harvey', 'Hazel', 'Heidi', 'Ian',
    'Iris', 'Isaac', 'Isabel', 'Janelle', 'Janine', 'Jasper', 'Jayson', 'Jean', 'Jefferson', 'Jenna',
    'Jericho', 'Jerome', 'Jessica', 'Jillian', 'Joanna', 'John', 'Jonas', 'Jordan', 'Jose', 'Joshua',
    'Joy', 'Judith', 'Julia', 'Justin', 'Karen', 'Karla', 'Karl', 'Kate', 'Kathryn', 'Katrina',
    'Kevin', 'Kim', 'Kyle', 'Lance', 'Lara', 'Lauren', 'Leah', 'Leo', 'Lester', 'Liam',
    'Liezl', 'Liza', 'Louis', 'Louise', 'Lucas', 'Lucille', 'Luis', 'Luna', 'Mabel', 'Marco',
    'Maria', 'Mariel', 'Marvin', 'Mason', 'Matteo', 'Maxine', 'Megan', 'Melanie', 'Mia', 'Miguel',
    'Mika', 'Mikaela', 'Mary', 'Monica', 'Nadine', 'Nathan', 'Nathaniel', 'Neil', 'Nicole', 'Nina',
    'Noah', 'Olivia', 'Oscar', 'Patricia', 'Paolo', 'Paul', 'Paula', 'Phoebe', 'Quentin', 'Rafael',
    'Raquel', 'Raymond', 'Reina', 'Renz', 'Rica', 'Rico', 'Rina', 'Riza', 'Roberto', 'Rochelle',
    'Rogelio', 'Rona', 'Ronald', 'Rose', 'Rowena', 'Ryan', 'Sabrina', 'Samantha', 'Samson', 'Sarah',
    'Sean', 'Shane', 'Sheila', 'Sophia', 'Stella', 'Stephen', 'Teresa', 'Thea', 'Timothy', 'Trisha',
    'Vanessa', 'Vera', 'Vincent', 'Violet', 'Wayne', 'Wendy', 'Willard', 'Xander', 'Yana', 'Zachary'
]

SYNTHETIC_LAST_NAMES = [
    'Abad', 'Aguilar', 'Alcantara', 'Alfonso', 'Alvarez', 'Aquino', 'Arevalo', 'Atienza', 'Bacani', 'Bautista',
    'Beltran', 'Bernardo', 'Bonifacio', 'Buenaventura', 'Cabrera', 'Calderon', 'Camacho', 'Campos', 'Candelaria', 'Capistrano',
    'Carreon', 'Castillo', 'Castro', 'Cervantes', 'Chavez', 'Concepcion', 'Contreras', 'Corpuz', 'Cortez', 'Cruz',
    'Cuevas', 'Dalisay', 'Dela Cruz', 'Del Rosario', 'Diaz', 'Domingo', 'Duran', 'Enriquez', 'Escobar', 'Espinosa',
    'Estrella', 'Evangelista', 'Fabian', 'Fajardo', 'Fernandez', 'Flores', 'Franco', 'Fuentes', 'Garcia', 'Gonzales',
    'Guerrero', 'Gutierrez', 'Hernandez', 'Ilagan', 'Jacinto', 'Jimenez', 'Labrador', 'Lacsamana', 'Lao', 'Legaspi',
    'Lim', 'Llamas', 'Lopez', 'Luna', 'Mabini', 'Macapagal', 'Magsaysay', 'Malvar', 'Manalo', 'Mendoza',
    'Mercado', 'Miranda', 'Navarro', 'Nolasco', 'Ocampo', 'Ortega', 'Pacheco', 'Padilla', 'Palma', 'Panganiban',
    'Pascual', 'Pineda', 'Quinto', 'Ramos', 'Reyes', 'Rivera', 'Robles', 'Rodriguez', 'Rojas', 'Romero',
    'Rosales', 'Rosario', 'Roxas', 'Salazar', 'Salvador', 'Sanchez', 'Santos', 'Soriano', 'Suarez', 'Tolentino',
    'Torres', 'Trinidad', 'Valdez', 'Valencia', 'Vargas', 'Velasco', 'Ventura', 'Vergara', 'Villanueva', 'Yap'
]

SUFFIXES = ["", "", "", "", "", "", "", "", "", "", "Jr.", "Sr.", "II", "III", "IV"]


def stable_seed(text: str) -> int:
    acc = 0
    for i, ch in enumerate(text):
        acc += (i + 1) * ord(ch)
    return acc


def name_key(first: str, middle: str, last: str, suffix: str) -> str:
    return f"{first}|{middle}|{last}|{suffix}"


def main() -> int:
    path = Path("ml/data/employability/combined_employability.csv")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    if not fieldnames:
        raise SystemExit("combined CSV has no header")

    name_cols = ["First Name", "Middle Name", "Last Name", "Suffix"]
    base_fields = [c for c in fieldnames if c not in name_cols]

    # Insert name fields right after Student Number when available.
    if "Student Number" in base_fields:
        idx = base_fields.index("Student Number") + 1
        out_fields = base_fields[:idx] + name_cols + base_fields[idx:]
    else:
        out_fields = name_cols + base_fields

    used = set()
    total = len(rows)
    suffix_target = max(50, int(total * 0.008))  # around 0.8%, still just a handful
    suffix_assigned = 0

    for i, row in enumerate(rows):
        token = f"{row.get('Student Number', '')}|{row.get('Program', '')}|{i}"
        seed = stable_seed(token)
        rng = random.Random(seed)

        first_idx = rng.randrange(len(SYNTHETIC_FIRST_NAMES))
        middle_idx = rng.randrange(len(SYNTHETIC_FIRST_NAMES))
        last_idx = rng.randrange(len(SYNTHETIC_LAST_NAMES))

        # Keep suffix rare.
        suffix = ""
        if suffix_assigned < suffix_target and rng.random() < 0.012:
            suffix = rng.choice([s for s in SUFFIXES if s])

        first = SYNTHETIC_FIRST_NAMES[first_idx]
        middle = SYNTHETIC_FIRST_NAMES[middle_idx]
        last = SYNTHETIC_LAST_NAMES[last_idx]

        # Resolve duplicates with bounded probing.
        k = name_key(first, middle, last, suffix)
        step = 0
        while k in used and step < 2000:
            step += 1
            first = SYNTHETIC_FIRST_NAMES[(first_idx + step) % len(SYNTHETIC_FIRST_NAMES)]
            middle = SYNTHETIC_FIRST_NAMES[(middle_idx + step * 3) % len(SYNTHETIC_FIRST_NAMES)]
            last = SYNTHETIC_LAST_NAMES[(last_idx + step * 5) % len(SYNTHETIC_LAST_NAMES)]
            if suffix_assigned < suffix_target and step % 37 == 0:
                suffix = rng.choice([s for s in SUFFIXES if s])
            else:
                suffix = ""
            k = name_key(first, middle, last, suffix)

        if suffix:
            suffix_assigned += 1
        used.add(k)

        row["First Name"] = first
        row["Middle Name"] = middle
        row["Last Name"] = last
        row["Suffix"] = suffix

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=out_fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Updated {path} with synthetic names. rows={total} unique_full_names={len(used)} suffix_count={suffix_assigned}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

