const { prisma } = require('../config/db');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Handles the submission of the Initial Alumni Tracer Survey.
 * Implements the append-only data pipeline for StudentAcademic features.
 */
const submitEmployabilitySurvey = async (req, res) => {
  try {
    const { studentId, academicData, skillRatings, additionalAnswers } = req.body;

    if (!studentId || !academicData || !skillRatings) {
      return res.status(400).json({ error: 'Missing required survey data' });
    }

    // 1. Verify User exists
    const user = await prisma.user.findUnique({ where: { username: String(studentId) } });
    if (!user) {
      return res.status(404).json({ error: 'User/Alumni record not found' });
    }

    let academicSnapshot;
    try {
      // 2. CREATE FEATURE SNAPSHOT (Append-Only StudentAcademic)
      academicSnapshot = await prisma.studentAcademic.create({
        data: {
          student_id: String(studentId),
          user_id: user.id,
          degree_id: parseInt(academicData.degree_id),
          gender: academicData.gender,
          age: parseInt(academicData.age),
          year_graduated: parseInt(academicData.year_graduated),
          cgpa: academicData.cgpa,
          prof_grade: academicData.prof_grade,
          elec_grade: academicData.elec_grade,
          ojt_grade: academicData.ojt_grade,
          leader_pos: (academicData.leader_pos === 'Yes' || academicData.leader_pos === true) ? 1 : 0,
          act_member_pos: (academicData.act_member_pos === 'Yes' || academicData.act_member_pos === true) ? 1 : 0
        }
      });
      
      // Update AlumniRecord status
      await prisma.alumniRecord.updateMany({
        where: { student_id: String(studentId) },
        data: { survey_status: 'completed' }
      });
    } catch (e) {
      fs.writeFileSync(path.join(__dirname, 'err-block2.txt'), String(e.stack || e));
      console.error("Block 2 Error (StudentAcademic creation):", e);
      throw e;
    }

    // 3. COMPUTE SKILL AVERAGES for the current model
    const hardSkills = skillRatings.filter(s => s.type === 'hard');
    const softSkills = skillRatings.filter(s => s.type === 'soft');
    
    const hardAve = hardSkills.length > 0 
      ? hardSkills.reduce((acc, curr) => acc + parseInt(curr.score), 0) / hardSkills.length 
      : 0;
    
    const softAve = softSkills.length > 0 
      ? softSkills.reduce((acc, curr) => acc + parseInt(curr.score), 0) / softSkills.length 
      : 0;

    // 4. CREATE SURVEY RESPONSE
    let surveyResponseData;
    try {
      surveyResponseData = await prisma.surveyResponse.create({
        data: {
          student_academic_id: academicSnapshot.id,
          template_id: 1, // Initial Tracer Template (Seeded earlier)
          hard_skills_ave: hardAve,
          soft_skills_ave: softAve,
          additional_data: additionalAnswers || {},
          completed_at: new Date(),
          status: 'completed'
        }
      });
    } catch (e) {
      fs.writeFileSync(path.join(__dirname, 'err-block4.txt'), String(e.stack || e));
      console.error("Block 4 Error (SurveyResponse creation):", e);
      throw e;
    }

    // 4b. SAVE GENERIC TRACER SURVEY ANSWERS
    if (additionalAnswers && Object.keys(additionalAnswers).length > 0) {
      const answerPromises = [];
      for (const [qId, ans] of Object.entries(additionalAnswers)) {
        if (ans !== undefined && ans !== null && ans !== '') {
          let ansText = null;
          let ansNum = null;
          let ansOptions = null;
          
          if (Array.isArray(ans)) {
            ansOptions = ans;
          } else if (typeof ans === 'number' || !isNaN(parseFloat(ans))) {
            ansNum = parseFloat(ans);
            ansText = String(ans);
          } else {
            ansText = String(ans);
          }
          
          answerPromises.push(
            prisma.surveyAnswer.create({
              data: {
                response_id: surveyResponseData.id,
                question_id: parseInt(qId),
                answer_text: ansText,
                answer_number: ansNum,
                answer_options: ansOptions
              }
            })
          );
        }
      }
      if (answerPromises.length > 0) {
        try {
          await Promise.all(answerPromises);
        } catch (ansErr) {
          console.error("Failed to insert survey answers:", ansErr);
          // Don't blow up the entire employability request if generic answers fail to insert gracefully
        }
      }
    }

    // 5. SAVE GRANULAR SKILL RATINGS (For future fine-tuning)
    for (const skill of skillRatings) {
      await prisma.responseSkill.create({
        data: {
          survey_response_id: surveyResponseData.id,
          skill_id: parseInt(skill.id),
          score: parseInt(skill.score)
        }
      });
    }

    // 6. TRIGGER ML PREDICTION
    const degree = await prisma.degree.findUnique({ where: { id: parseInt(academicData.degree_id) } });
    
    const modelInput = {
      "Gender": academicSnapshot.gender,
      "Age": academicSnapshot.age,
      "Degree": degree ? degree.name : "Unknown",
      "Year Graduated": academicSnapshot.year_graduated,
      "CGPA": parseFloat(academicSnapshot.cgpa),
      "Average Prof Grade": parseFloat(academicSnapshot.prof_grade),
      "Average Elec Grade": parseFloat(academicSnapshot.elec_grade),
      "OJT Grade": parseFloat(academicSnapshot.ojt_grade),
      "Leadership POS": academicSnapshot.leader_pos ? "Yes" : "No",
      "Act Member POS": academicSnapshot.act_member_pos ? "Yes" : "No",
      "Soft Skills Ave": parseFloat(softAve.toFixed(2)),
      "Hard Skills Ave": parseFloat(hardAve.toFixed(2))
    };

    const pyScriptPath = path.join(__dirname, '../../ml/scripts/predict_employability.py');
    const venvPythonPath = path.join(__dirname, '../../ml/venv/Scripts/python.exe');
    const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python';
    
    const pythonProcess = spawn(pythonExecutable, [pyScriptPath]);
    
    pythonProcess.on('error', (err) => {
      console.error('[ML] Failed to start Python process in submit:', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to start ML pipeline' });
      }
    });

    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdin.write(JSON.stringify(modelInput));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('ML Prediction Process Error:', errorData);
        return res.status(500).json({ error: 'ML Prediction service failed' });
      }

      try {
        const predictionResult = JSON.parse(outputData);
        
        if (predictionResult.status === 'success') {
          // 7. SAVE PREDICTION RECORD
          await prisma.employabilityPrediction.create({
            data: {
              student_academic_id: academicSnapshot.id,
              survey_response_id: surveyResponseData.id,
              model_version: predictionResult.model_type || '1.0.0',
              employable: predictionResult.employable ? 1 : 0,
              probability: predictionResult.probability,
              input_snapshot: modelInput
            }
          });
          
          // 8. SCHEDULE FOLLOW-UP (Standard 2 months later as ground truth collector)
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 2);
          
          await prisma.followupSchedule.create({
            data: {
              student_academic_id: academicSnapshot.id,
              template_id: 2, // Follow-up Template
              due_date: dueDate
            }
          });

          return res.json({ 
            success: true, 
            message: 'Survey processed and prediction generated',
            prediction: {
              employable: predictionResult.employable,
              probability: predictionResult.probability,
              label: predictionResult.label,
              confidence: predictionResult.confidence
            }
          });
        } else {
          console.error('ML Script Error Message:', predictionResult.message);
          return res.status(500).json({ error: 'Prediction script returned error' });
        }
      } catch (e) {
        fs.writeFileSync(path.join(__dirname, 'err-python.txt'), outputData);
        console.error('Error securely recording prediction result:', e, 'Raw output:', outputData);
        return res.status(500).json({ error: 'Failed to record prediction result' });
      }
    });

  } catch (error) {
    fs.writeFileSync(path.join(__dirname, 'err-fatal.txt'), String(error.stack || error));
    console.error('Fatal Employability Survey Error:', error);
    res.status(500).json({ error: 'Internal server error processing survey' });
  }
};

/**
 * Gets the latest prediction for an alumni
 */
const getLatestPrediction = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const prediction = await prisma.employabilityPrediction.findFirst({
      where: {
        student_academic: {
          student_id: String(studentId)
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        student_academic: true
      }
    });

    if (!prediction) {
      return res.status(404).json({ error: 'No prediction found for this alumni' });
    }

    res.json(prediction);
  } catch (error) {
    console.error('Get latest prediction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Performs a "Dry Run" prediction for the Model Simulator.
 * Does not persist any data to the database.
 */
const testPrediction = async (req, res) => {
  try {
    const { modelInput } = req.body;

    if (!modelInput) {
      return res.status(400).json({ error: 'Missing model input data' });
    }

    const pyScriptPath = path.join(__dirname, '../../ml/scripts/predict_employability.py');
    const venvPythonPath = path.join(__dirname, '../../ml/venv/Scripts/python.exe');
    
    // Strictly prefer venv, fallback to 'python' only if venv is missing
    const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python';
    
    console.log(`[ML] Executing prediction with: ${pythonExecutable}`);

    const pythonProcess = spawn(pythonExecutable, [pyScriptPath]);
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdin.write(JSON.stringify(modelInput));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('ML Prediction Process Error:', errorData);
        return res.status(500).json({ error: 'ML Prediction service failed', details: errorData });
      }

      try {
        const predictionResult = JSON.parse(outputData);
        if (predictionResult.status === 'success') {
          return res.json({ 
            success: true, 
            prediction: predictionResult 
          });
        } else {
          return res.status(500).json({ error: predictionResult.message });
        }
      } catch (e) {
        console.error('Parsing error:', e, outputData);
        return res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });

  } catch (error) {
    console.error('Fatal Test Prediction Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  submitEmployabilitySurvey,
  getLatestPrediction,
  testPrediction
};
