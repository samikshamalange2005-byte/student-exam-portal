const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Exam = require('../models/Exam');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/rooms - List all rooms
router.get('/', verifyToken, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    return res.json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return res.status(500).json({ message: 'Error retrieving rooms.', error: error.message });
  }
});

// POST /api/rooms - Create a new room (Admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, capacity } = req.body;

    if (!name || capacity === undefined || capacity === null) {
      return res.status(400).json({ message: 'Room name and capacity are required.' });
    }

    const parsedCapacity = parseInt(capacity, 10);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({ message: 'Room capacity must be a positive number greater than 0.' });
    }

    const trimmedName = name.trim();
    const existing = await Room.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: `A room named "${trimmedName}" already exists.` });
    }

    const room = new Room({
      name: trimmedName,
      capacity: parsedCapacity
    });

    await room.save();

    return res.status(201).json({
      success: true,
      message: `Room "${room.name}" with capacity ${room.capacity} created successfully.`,
      room
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ message: 'Error creating room.', error: error.message });
  }
});

// DELETE /api/rooms/:id - Delete a room (Admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    // Check if room is assigned to upcoming exams
    const activeExams = await Exam.countDocuments({
      $or: [{ roomId: room._id }, { room: room.name }]
    });

    if (activeExams > 0) {
      return res.status(400).json({
        message: `Cannot delete room "${room.name}" because it is currently assigned to ${activeExams} exam schedule(s).`
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: `Room "${room.name}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    return res.status(500).json({ message: 'Error deleting room.', error: error.message });
  }
});

module.exports = router;
