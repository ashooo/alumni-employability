const db = require('../config/db');
const { runMlScript } = require('../utils/mlRunner');

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

    // 3. Run Python script
    const result = await runMlScript({
      scriptPath: 'scripts/predict_api.py',
      input: historicalData
    });

    if (result.code !== 0) {
      console.error('Python script error output:', result.stderr);
      return res.status(500).json({ error: 'Failed to generate prediction with model.', details: result.stderr });
    }

    try {
      return res.json(JSON.parse(result.stdout));
    } catch (e) {
      console.error('Error parsing Python script output:', result.stdout);
      return res.status(500).json({ error: 'Failed to parse model output.', details: result.stdout });
    }

  } catch (error) {
    console.error('Get ARIMA prediction error:', error);
    res.status(500).json({ error: 'Server error generating model predictions' });
  }
};

module.exports = {
  getArimaPrediction
};
