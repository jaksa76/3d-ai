import express from 'express';
import path from 'path';
import OpenAI from 'openai';

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

const messages = [{ role: 'system', content: `You are a javascript generator. Answer only and exclusively using javascript snippets. You are making a 3d scene using Three.js. The user will ask you to modify the scene and you will generate the required javascript code to implement the requested modifications.
                    
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
    ` }];

/**
 * Function to generate a scene update based on the voice command received.
 * Returns a javascript snippet that can be executed on the client side to update the scene.
 */
async function generateSceneUpdate(voiceCommand) {
    try {
        messages.push({ role: 'user', content: voiceCommand });
        const response = await openai.chat.completions.create({
            messages,
            model: "gpt-4o-mini",
        });

        messages.push({ role: 'generator', content: response.choices[0].message });
        let snippet = response.choices[0].message.content;
        
        // replace starting and trailing ``` if present
        if (snippet.startsWith('```')) {
            if (snippet.startsWith('```javascript')) {
                snippet = snippet.slice(13);
            } else {
                snippet = snippet.slice(3);
            }
            if (snippet.endsWith('```')) {
                snippet = snippet.slice(0, -3);
            }
        }

        // replace \n with newlines
        snippet = snippet.replace(/\\n/g, '\n');

        return snippet;
    } catch (error) {
        console.error('Error generating scene update:', error);
        return '';
    }
}

// Endpoint to handle voice commands
app.post('/voice-command', async (req, res) => {
    const voiceCommand = req.body.command;
    console.log('Received voice command:', voiceCommand);
    
    const sceneUpdate = await generateSceneUpdate(voiceCommand);

    res.json({ status: 'success', command: voiceCommand, sceneUpdate });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
