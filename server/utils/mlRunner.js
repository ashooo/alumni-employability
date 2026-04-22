const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ML_ROOT = path.resolve(__dirname, '../../ml');
const VENV_PYTHON = path.join(ML_ROOT, 'venv', 'Scripts', 'python.exe');

function resolvePythonExecutable() {
  return fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python';
}

function resolveScriptPath(relativeScriptPath) {
  return path.resolve(ML_ROOT, relativeScriptPath);
}

function runMlScript({ scriptPath, input, timeoutMs = 60000 }) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = resolvePythonExecutable();
    const absoluteScriptPath = resolveScriptPath(scriptPath);
    const processRef = spawn(pythonExecutable, [absoluteScriptPath]);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      processRef.kill();
    }, timeoutMs);

    processRef.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    processRef.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    processRef.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    processRef.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        return resolve({ code: 124, stdout, stderr: `${stderr}\nScript timed out.` });
      }
      return resolve({ code, stdout, stderr });
    });

    if (input !== undefined) {
      const payload = typeof input === 'string' ? input : JSON.stringify(input);
      processRef.stdin.write(payload);
    }
    processRef.stdin.end();
  });
}

module.exports = {
  runMlScript,
  resolvePythonExecutable
};

