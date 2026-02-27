const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

console.log('--- Server Starting with Database Fix ---');
console.log('DATABASE_URL found:', !!process.env.DATABASE_URL);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder']
}));
app.use(bodyParser.json());

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('--- Request Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

/* ─── LEGACY Expense Endpoints (kept) ─────────────────────── */
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { title, amount, category, date, type, unit } = req.body;
        const record = await prisma.expense.create({
            data: { title, amount: parseFloat(amount), category, date, type: type || 'EXPENSE', unit: unit || '₹' }
        });
        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        await prisma.expense.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

/* ─── DYNAMIC FORMS ─────────────────────────────────────────── */

// List all forms
app.get('/api/forms', async (req, res) => {
    try {
        const forms = await prisma.form.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(forms);
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

// Create a form
app.post('/api/forms', async (req, res) => {
    try {
        const { name, fields } = req.body;
        console.log(`[DB] Attempting to create form: "${name}" with fields:`, fields);
        const form = await prisma.form.create({
            data: { name, fields: JSON.stringify(fields) }
        });
        console.log(`[DB] Form created successfully with ID: ${form.id}`);
        res.status(201).json(form);
    } catch (err) {
        console.error('[DB ERROR] Failed to create form:', err);
        res.status(500).json({
            message: 'DB error',
            error: err.message,
            stack: err.stack,
            code: err.code
        });
    }
});

// Update a form
app.put('/api/forms/:id', async (req, res) => {
    try {
        const { name, fields } = req.body;
        const form = await prisma.form.update({
            where: { id: parseInt(req.params.id) },
            data: { name, fields: JSON.stringify(fields) }
        });
        res.json(form);
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

// Delete a form (cascade deletes entries)
app.delete('/api/forms/:id', async (req, res) => {
    try {
        await prisma.form.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Form deleted' });
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

// Get entries for a form
app.get('/api/forms/:formId/entries', async (req, res) => {
    try {
        const entries = await prisma.formEntry.findMany({
            where: { formId: parseInt(req.params.formId) },
            orderBy: { date: 'desc' }
        });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

// Add entry to a form
app.post('/api/forms/:formId/entries', async (req, res) => {
    try {
        const { data, date } = req.body;
        const entry = await prisma.formEntry.create({
            data: { formId: parseInt(req.params.formId), data: JSON.stringify(data), date }
        });
        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

// Update an entry
app.put('/api/entries/:id', async (req, res) => {
    try {
        const { data, date } = req.body;
        const entry = await prisma.formEntry.update({
            where: { id: parseInt(req.params.id) },
            data: { data: JSON.stringify(data), date }
        });
        res.json(entry);
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

// Get all entries from all forms (for dashboard)
app.get('/api/all-entries', async (req, res) => {
    try {
        const entries = await prisma.formEntry.findMany({
            include: {
                form: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' },
            take: 100 // Limit for dashboard performance
        });
        res.json(entries);
    } catch (err) {
        console.error('[DB ERROR] Fetch all entries:', err);
        res.status(500).json({ message: 'DB error' });
    }
});

// Delete an entry
app.delete('/api/entries/:id', async (req, res) => {
    try {
        await prisma.formEntry.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Entry deleted' });
    } catch (err) {
        res.status(500).json({ message: 'DB error' });
    }
});

const os = require('os');
const networkInterfaces = os.networkInterfaces();
let localIp = 'localhost';

for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            localIp = net.address;
            break;
        }
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Local network access: http://${localIp}:${PORT}`);
    console.log(`📱 Use this URL in your Android App: http://${localIp}:${PORT}\n`);
});

// Final Error Handler
app.use((err, req, res, next) => {
    console.error('FATAL ERROR:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: err.stack
    });
});

