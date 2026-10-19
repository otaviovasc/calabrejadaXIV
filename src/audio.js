import {SOUND} from '../assets/definitions.js';
export class AudioKit{
  constructor(){this.muted=true;this.context=null}
  setMuted(muted){this.muted=muted}
  play(effect){if(this.muted)return;try{this.context=this.context||new(window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')this.context.resume();const spec=SOUND[effect],osc=this.context.createOscillator(),gain=this.context.createGain(),now=this.context.currentTime;osc.type=spec.type;osc.frequency.setValueAtTime(spec.frequency,now);if(spec.endFrequency)osc.frequency.exponentialRampToValueAtTime(spec.endFrequency,now+spec.duration);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.065,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+spec.duration);osc.connect(gain);gain.connect(this.context.destination);osc.start(now);osc.stop(now+spec.duration+.02)}catch{}}
  checkpoint(){this.play('checkpoint');if(!this.muted)setTimeout(()=>this.play('start'),100)}
}
