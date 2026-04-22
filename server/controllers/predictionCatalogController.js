const { prisma } = require('../config/db');

const getSkills = async (req, res) => {
  try {
    const skills = await prisma.skill.findMany();
    res.json(skills);
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
};

const getDegrees = async (req, res) => {
  try {
    const degrees = await prisma.degree.findMany();
    res.json(degrees);
  } catch (error) {
    console.error('Get degrees error:', error);
    res.status(500).json({ error: 'Failed to fetch degrees' });
  }
};

module.exports = {
  getSkills,
  getDegrees
};

