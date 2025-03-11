# Quantum Drift

A fast-paced neon spaceship combat game built with Three.js and WebGL.

![Quantum Drift Screenshot](screenshot.png)

## Features

- Top-down space combat with intuitive controls
- Beautiful neon visual effects and 3D models
- Modern webpack configuration with code splitting
- Collision detection and physics

## Getting Started

### Prerequisites

- Node.js 14+ and npm installed

### Installation

1. Clone the repository
```bash
git clone https://github.com/menezmethod/quantum-drift.git
cd quantum-drift
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Open your browser and navigate to http://localhost:8080

### Building for Production

```bash
npm run build
```

## Controls

- W/↑: Move forward
- S/↓: Move backward
- A/←: Rotate left
- D/→: Rotate right
- Q/E: Strafe left/right
- Space: Fire laser

## Technologies Used

- Three.js for 3D rendering
- Webpack for bundling
- GLTFLoader for 3D model loading

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- 3D model credits: Avrocar VZ-9-AV Experimental Aircraft 

## Multiplayer Setup

Quantum Drift now supports multiplayer functionality! Here's how to set it up:

### Running the Multiplayer Server

1. Install the required dependencies:
   ```
   npm install
   ```

2. Start both the game client and server:
   ```
   npm run dev:all
   ```

   This will start both the game client (webpack dev server) and the multiplayer server simultaneously.

3. If you want to run just the server:
   ```
   npm run server
   ```

### Connecting to a Server

By default, the game will connect to a local server running at `http://localhost:3000` when multiplayer mode is enabled. 

### Multiplayer Features

- Real-time player position and rotation synchronization
- Weapon firing synchronization
- Player name and ship type synchronization
- Player join/leave notifications
- Connection status indicator

### Network Architecture

Quantum Drift uses a simple client-server architecture with Socket.io:

- **WebSocket Communication**: Reliable, full-duplex communication
- **Event-based**: Players receive only the events they need to know about
- **Optimized Updates**: Position updates are throttled to 20 per second to reduce bandwidth
- **Event Broadcasting**: Server broadcasts events to all relevant clients

### Customizing the Server

You can customize the server by editing `server.js`. Some options you might want to change:

- **Port**: Change the `PORT` constant (default: 3000)
- **Update Rate**: Adjust timing parameters in the NetworkManager
- **Game Logic**: Add server-side validation for important game actions 