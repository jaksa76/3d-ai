import express from 'express';
import path from 'path';
import OpenAI from 'openai';
import { log } from 'console';

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
// app.use(express.static(path.join(__dirname)));

// Serve index.html at the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const openai = new OpenAI();
const sessionHistories = {};

/**
 * Function to generate a scene update based on the voice command received.
 * Returns a javascript snippet that can be executed on the client side to update the scene.
 */
async function generateSceneUpdate(sessionId, voiceCommand, imageData) {
    try {
        if (!sessionHistories[sessionId]) {
            sessionHistories[sessionId] = [{ role: 'system', content: `You are a javascript coding assistant. Answer only and exclusively using javascript snippets. You are making a 3d scene using Three.js. The user will ask you to modify the scene and you will generate the required javascript code to implement the requested modifications. Make sure that anything you create is saved in window.objects. And if you reference anything, reference it from window.objects.
                    
    This is the starting code that has already been executed:

    const canvasContainer = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvasContainer.appendChild(renderer.domElement);
    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
    window.objects = {};
    ` }];
        }

        const messages = sessionHistories[sessionId];
        messages.push({ role: 'user', content: voiceCommand });
        if (imageData) {
            messages.push({
                role: "user",
                content: [
                  { type: "text", text: voiceCommand },
                  { type: "image_url", image_url: { "url": imageData } }
                ],
              });
        }
        const response = await openai.chat.completions.create({
            messages,
            model: "gpt-4o-mini",
        });

        const message = response.choices[0].message;
        messages.push(message);
        let content = message.content;
        
        // replace starting and trailing ``` if present
        if (content.startsWith('```')) {
            if (content.startsWith('```javascript')) {
                content = content.slice(13);
            } else {
                content = content.slice(3);
            }
            if (content.endsWith('```')) {
                content = content.slice(0, -3);
            }
        }

        // replace \n with newlines
        content = content.replace(/\\n/g, '\n');

        return content;
    } catch (error) {
        console.error('Error generating scene update:', error);
        return '';
    }
}

// Endpoint to handle voice commands
app.post('/voice-command', async (req, res) => {
    const { sessionId, command, imageData } = req.body;
    console.log('Received voice command:', command);
    
    const sceneUpdate = await generateSceneUpdate(sessionId, command, imageData);

    res.json({ status: 'success', command, sceneUpdate });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
