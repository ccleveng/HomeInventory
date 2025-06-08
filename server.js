// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const INVENTORY_FILE = 'C:\\Users\\choco\\OneDrive\\Documents\\inventory\\inventory.txt';

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve static files from public directory

// Ensure inventory directory exists
async function ensureInventoryFile() {
    try {
        const dir = path.dirname(INVENTORY_FILE);
        await fs.mkdir(dir, { recursive: true });
        
        // Check if file exists, if not create empty array
        try {
            await fs.access(INVENTORY_FILE);
        } catch {
            await fs.writeFile(INVENTORY_FILE, JSON.stringify([], null, 2));
            console.log('Created new inventory file at:', INVENTORY_FILE);
        }
    } catch (error) {
        console.error('Error setting up inventory file:', error);
    }
}

// Load inventory data
async function loadInventory() {
    try {
        const data = await fs.readFile(INVENTORY_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading inventory:', error);
        return [];
    }
}

// Save inventory data
async function saveInventory(data) {
    try {
        await fs.writeFile(INVENTORY_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving inventory:', error);
        return false;
    }
}

// API Routes

// Get all items
app.get('/api/items', async (req, res) => {
    try {
        const items = await loadInventory();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load inventory' });
    }
});

// Add new item
app.post('/api/items', async (req, res) => {
    try {
        const items = await loadInventory();
        const newItem = {
            id: Date.now() + Math.random(),
            name: req.body.name?.trim(),
            room: req.body.room?.trim(),
            outerLocation: req.body.outerLocation?.trim() || '',
            innerLocation: req.body.innerLocation?.trim() || '',
            category: req.body.category || '',
            quantity: parseInt(req.body.quantity) || 1,
            description: req.body.description?.trim() || '',
            dateAdded: new Date().toISOString()
        };

        if (!newItem.name || !newItem.room) {
            return res.status(400).json({ error: 'Name and room are required' });
        }

        items.unshift(newItem);
        const saved = await saveInventory(items);
        
        if (saved) {
            res.json(newItem);
        } else {
            res.status(500).json({ error: 'Failed to save item' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
    try {
        const items = await loadInventory();
        const itemId = parseFloat(req.params.id);
        const filteredItems = items.filter(item => item.id !== itemId);
        
        if (filteredItems.length === items.length) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const saved = await saveInventory(filteredItems);
        
        if (saved) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to delete item' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Search items
app.get('/api/search', async (req, res) => {
    try {
        const items = await loadInventory();
        const query = req.query.q?.toLowerCase() || '';
        
        if (!query) {
            return res.json(items);
        }

        const filtered = items.filter(item => {
            const locationText = [item.room, item.outerLocation, item.innerLocation].filter(Boolean).join(' ');
            const searchText = `${item.name} ${locationText} ${item.description} ${item.category}`.toLowerCase();
            return searchText.includes(query);
        });

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search items' });
    }
});

// Initialize and start server
async function startServer() {
    await ensureInventoryFile();
    app.listen(PORT, () => {
        console.log(`Home Inventory server running at http://localhost:${PORT}`);
        console.log(`Inventory file: ${INVENTORY_FILE}`);
    });
}

startServer();
