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
    
    // Define common sounds to preload
    const soundsToLoad = [
      { name: 'laser', path: 'sounds/laser.mp3' },
      { name: 'explosion', path: 'sounds/explosion.mp3' },
      { name: 'hit', path: 'sounds/hit.mp3' },
      { name: 'powerup', path: 'sounds/powerup.mp3' },
      { name: 'engine', path: 'sounds/engine.mp3', loop: true }
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
    
    // Load background music
    try {
      this.music = new THREE.Audio(this.listener);
      audioLoader.load(
        'sounds/background_music.mp3',
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
    
    // If sound is already playing, clone it
    if (sound.isPlaying) {
      const soundClone = sound.clone();
      soundClone.play();
      
      // Clean up clone after playing
      soundClone.onEnded = () => {
        soundClone.disconnect();
      };
    } else {
      sound.play();
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