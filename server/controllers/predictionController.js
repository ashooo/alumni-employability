const db = require('../config/db');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const getArimaPrediction = async (req, res) => {
  try {
    // 1. Get real data from database
    // We get alumni who have an employment record
    const [rows] = await db.query(`
      SELECT 
          ar.batch_year as year,
          SUM(CASE WHEN er.status = 'Employed' THEN 1 ELSE 0 END) as employed,
          COUNT(er.id) as total
      FROM alumni_records ar
      JOIN employment_records er ON ar.student_id = er.student_id
      WHERE er.status IS NOT NULL AND ar.batch_year <= YEAR(CURDATE())
      GROUP BY ar.batch_year
      ORDER BY ar.batch_year ASC
    `);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No employment data found to run ARIMA predictions.' });
    }

    // 2. Format it to what we'll send to Python
    const historicalData = rows.map(r => ({
      year: r.year,
      employment_rate: r.total > 0 ? (r.employed / r.total) * 100 : 0
    }));

    // 3. Spawn Python script
    const pyScriptPath = path.join(__dirname, '../../ml/scripts/predict_api.py');
    const venvPythonPath = path.join(__dirname, '../../ml/venv/Scripts/python.exe');
    const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python';
    const pythonProcess = spawn(pythonExecutable, [pyScriptPath]);

    let outputData = '';
    let errorData = '';

    // Send data to python via stdin
    pythonProcess.stdin.write(JSON.stringify(historicalData));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error output:', errorData);
        return res.status(500).json({ error: 'Failed to generate prediction with model.', details: errorData });
      }

      try {
        const result = JSON.parse(outputData);
        return res.json(result);
      } catch (e) {
        console.error('Error parsing Python script output:', outputData);
        return res.status(500).json({ error: 'Failed to parse model output.', details: outputData });
      }
    });

  } catch (error) {
    console.error('Get ARIMA prediction error:', error);
    res.status(500).json({ error: 'Server error generating model predictions' });
  }
};

module.exports = {
  getArimaPrediction
};
