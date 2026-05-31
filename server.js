const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const LEARNING_RECORDS_FILE = path.join(__dirname, 'learning-records.json');

function readLearningRecords() {
  try {
    if (fs.existsSync(LEARNING_RECORDS_FILE)) {
      const data = fs.readFileSync(LEARNING_RECORDS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    return [];
  }
}

function writeLearningRecords(records) {
  try {
    fs.writeFileSync(LEARNING_RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch (error) {
    return false;
  }
}

app.post('/api/learning-records', (req, res) => {
  try {
    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: req.body.type || 'phase-diagram',
      temperature: req.body.temperature,
      composition: req.body.composition,
      phaseComposition: req.body.phaseComposition,
      phases: req.body.phases,
      hardness: req.body.hardness,
      coolingRate: req.body.coolingRate,
      microstructure: req.body.microstructure,
      leverLawExercise: req.body.leverLawExercise,
      userNote: req.body.userNote || ''
    };

    const records = readLearningRecords();
    records.push(record);
    const success = writeLearningRecords(records);

    if (success) {
      res.json({ success: true, record });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save record' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/calculate-hardness', (req, res) => {
  try {
    const { composition, coolingRate, phases } = req.body;
    const hardness = calculateHardness(composition, coolingRate, phases);
    res.json({ success: true, hardness });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateHardness(composition, coolingRate, phases) {
  let baseHardness = 80;
  
  if (phases) {
    if (phases.includes('martensite')) {
      baseHardness += 400 + (composition || 0.4) * 300;
    } else if (phases.includes('bainite')) {
      baseHardness += 200 + (composition || 0.4) * 150;
    } else if (phases.includes('pearlite')) {
      baseHardness += 100 + (composition || 0.4) * 100;
    }
  }
  
  if (coolingRate) {
    baseHardness += Math.log(coolingRate + 1) * 50;
  }
  
  return Math.round(baseHardness);
}

app.get('/api/learning-records', (req, res) => {
  try {
    const records = readLearningRecords();
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/learning-records/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let records = readLearningRecords();
    records = records.filter(r => r.id !== id);
    const success = writeLearningRecords(records);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete record' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`相图模拟器服务器运行在 http://localhost:${PORT}`);
});
