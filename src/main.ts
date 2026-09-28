import './style.css';
import { GameEngine } from './game/GameEngine';

window.addEventListener('DOMContentLoaded', () => {
  const appEl = document.getElementById('app');
  if (appEl) {
    new GameEngine(appEl);
  }
});
