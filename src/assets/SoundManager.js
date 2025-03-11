import * as THREE from 'three';

/**
 * SoundManager class for managing game audio
 */
export class SoundManager {
  constructor() {
    // Initialize audio listeners, buffers, and sources
    this.listener = new THREE.AudioListener();
    this.sounds = new Map();
    this.music = null;
    this.isMuted = false;
    
    // Default volumes
    this.effectsVolume = 0.5;
    this.musicVolume = 0.3;
    
    // Preload common sounds
    this.preloadSounds();
    
    // Setup audio control buttons
    this.setupAudioControls();
  }
  
  /**
   * Preload common game sounds
   */
  preloadSounds() {
    // Create a sound loader
    const audioLoader = new THREE.AudioLoader();
    
    // Define common sounds to preload with updated paths
    const soundsToLoad = [
      { name: 'laser', path: 'assets/sounds/laser.mp3' },
      { name: 'explosion', path: 'assets/sounds/explosion.mp3' },
      { name: 'hit', path: 'assets/sounds/hit.mp3' },
      { name: 'powerup', path: 'assets/sounds/powerup.mp3' },
      { name: 'engine', path: 'assets/sounds/engine.mp3', loop: true },
      { name: 'laser-bounce', path: 'assets/sounds/laser-bounce.mp3' },
      { name: 'weapon-switch', path: 'assets/sounds/weapon-switch.mp3' },
      { name: 'collision', path: 'assets/sounds/collision.mp3' },
      { name: 'weapon-charging', path: 'assets/sounds/weapon-charging.mp3' },
      { name: 'bounce', path: 'assets/sounds/bounce.mp3' },
      { name: 'weapon-armor-hit', path: 'assets/sounds/weapon-armor-hit.mp3' },
      { name: 'grenade-laser', path: 'assets/sounds/grenade-laser.mp3' }
    ];
    
    // Load each sound
    soundsToLoad.forEach(soundInfo => {
      try {
        const sound = new THREE.Audio(this.listener);
        
        audioLoader.load(
          soundInfo.path,
          buffer => {
            sound.setBuffer(buffer);
            sound.setVolume(this.effectsVolume);
            if (soundInfo.loop) {
              sound.setLoop(true);
            }
            this.sounds.set(soundInfo.name, sound);
            console.log(`Loaded sound: ${soundInfo.name}`);
          },
          xhr => {
            console.log(`${soundInfo.name}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
          },
          error => {
            console.error(`Error loading sound ${soundInfo.name}:`, error);
          }
        );
      } catch (error) {
        console.error(`Failed to setup sound ${soundInfo.name}:`, error);
      }
    });
    
    // Load background music with updated path
    try {
      this.music = new THREE.Audio(this.listener);
      audioLoader.load(
        'assets/sounds/background_music.mp3',
        buffer => {
          this.music.setBuffer(buffer);
          this.music.setVolume(this.musicVolume);
          this.music.setLoop(true);
        },
        xhr => {
          console.log(`Background music: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        error => {
          console.error('Error loading background music:', error);
        }
      );
    } catch (error) {
      console.error('Failed to setup background music:', error);
    }
  }
  
  /**
   * Setup audio control buttons
   */
  setupAudioControls() {
    // Add event listeners for audio controls if they exist in the DOM
    const muteButton = document.getElementById('mute-button');
    if (muteButton) {
      muteButton.addEventListener('click', () => this.toggleMute());
    }
    
    const effectsVolumeSlider = document.getElementById('effects-volume');
    if (effectsVolumeSlider) {
      effectsVolumeSlider.value = this.effectsVolume * 100;
      effectsVolumeSlider.addEventListener('input', (e) => {
        this.setEffectsVolume(e.target.value / 100);
      });
    }
    
    const musicVolumeSlider = document.getElementById('music-volume');
    if (musicVolumeSlider) {
      musicVolumeSlider.value = this.musicVolume * 100;
      musicVolumeSlider.addEventListener('input', (e) => {
        this.setMusicVolume(e.target.value / 100);
      });
    }
  }
  
  /**
   * Play a sound by name
   * @param {string} name - Name of the sound to play
   * @param {THREE.Vector3} position - Optional position for 3D audio
   */
  playSound(name, position = null) {
    if (this.isMuted) return;
    
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound '${name}' not found`);
      return;
    }
    
    let soundToPlay = sound;
    
    // If sound is already playing, create a new instance
    if (sound.isPlaying) {
      try {
        // Create a new audio instance
        if (position) {
          // For positional audio
          const soundClone = new THREE.PositionalAudio(this.listener);
          soundClone.setBuffer(sound.buffer);
          soundClone.setVolume(this.effectsVolume);
          soundClone.setRefDistance(10); // Distance at which the volume is at full
          soundToPlay = soundClone;
        } else {
          // For non-positional audio - create new instead of cloning
          const soundClone = new THREE.Audio(this.listener);
          soundClone.setBuffer(sound.buffer);
          soundClone.setVolume(this.effectsVolume);
          soundToPlay = soundClone;
        }
        
        // Clean up clone after playing
        soundToPlay.onEnded = () => {
          if (soundToPlay.source) {
            soundToPlay.disconnect();
            soundToPlay.source = null; // Prevent memory leaks
          }
        };
      } catch (error) {
        console.error("Error creating new sound instance:", error);
        // If cloning fails, don't play any sound rather than crashing
        return;
      }
    }
    
    // If position is provided, make it positional
    if (position && !sound.isPlaying) {
      // We're using the original sound, convert it to positional if needed
      if (!(soundToPlay instanceof THREE.PositionalAudio)) {
        try {
          // Create new positional audio
          const positionalSound = new THREE.PositionalAudio(this.listener);
          positionalSound.setBuffer(sound.buffer);
          positionalSound.setVolume(this.effectsVolume);
          positionalSound.setRefDistance(10);
          soundToPlay = positionalSound;
        } catch (error) {
          console.error("Error creating positional audio:", error);
          // Fall back to non-positional
        }
      }
    }
    
    // Apply position if provided
    if (position && soundToPlay instanceof THREE.PositionalAudio) {
      try {
        // Check if we need to add this to an object in the scene
        const dummyObject = new THREE.Object3D();
        dummyObject.position.copy(position);
        dummyObject.add(soundToPlay);
        
        // Cleanup function to remove the dummy object after playing
        soundToPlay.onEnded = () => {
          if (dummyObject.parent) dummyObject.parent.remove(dummyObject);
          if (soundToPlay.source) {
            soundToPlay.disconnect();
            soundToPlay.source = null;
          }
        };
        
        // Add to scene or listener (we assume listener is in scene)
        if (this.listener && this.listener.parent) {
          this.listener.parent.add(dummyObject);
        } else {
          console.warn('Audio listener has no parent, positional audio may not work correctly');
          // Just play non-positional as fallback
        }
      } catch (error) {
        console.error("Error setting up positional audio:", error);
        // Fall back to just playing the sound
      }
    }
    
    // Play the sound
    try {
      soundToPlay.play();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }
  
  /**
   * Start playing background music
   */
  playMusic() {
    if (this.isMuted || !this.music || this.music.isPlaying) return;
    
    this.music.play();
  }
  
  /**
   * Stop background music
   */
  stopMusic() {
    if (!this.music || !this.music.isPlaying) return;
    
    this.music.stop();
  }
  
  /**
   * Toggle mute state for all audio
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    // Update mute button if it exists
    const muteButton = document.getElementById('mute-button');
    if (muteButton) {
      muteButton.textContent = this.isMuted ? '🔇' : '🔊';
    }
    
    if (this.isMuted) {
      // Pause all sounds
      this.sounds.forEach(sound => {
        if (sound.isPlaying) {
          sound.pause();
        }
      });
      
      // Pause music
      if (this.music && this.music.isPlaying) {
        this.music.pause();
      }
    } else {
      // Resume music
      if (this.music && !this.music.isPlaying) {
        this.music.play();
      }
    }
  }
  
  /**
   * Set volume for sound effects
   * @param {number} volume - Volume level (0-1)
   */
  setEffectsVolume(volume) {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
    
    // Update all sound effects with new volume
    this.sounds.forEach(sound => {
      sound.setVolume(this.effectsVolume);
    });
  }
  
  /**
   * Set volume for background music
   * @param {number} volume - Volume level (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    
    if (this.music) {
      this.music.setVolume(this.musicVolume);
    }
  }
  
  /**
   * Get the audio listener for positioning
   * @returns {THREE.AudioListener} The audio listener
   */
  getListener() {
    return this.listener;
  }
} 