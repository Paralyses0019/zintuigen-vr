// One monotonic clock, shared by image and audio. Seeking skips past cues;
// a cue exactly at the requested ?t= offset is still played once.
export class Timeline {
  constructor(offset=0) {
    this.offset=offset;
    this.start=performance.now();
    this.cues=[];
  }
  at(second,fn) {
    this.cues.push({second,fn,done:second<this.offset-.001});
    return this;
  }
  update() {
    const now=this.offset+(performance.now()-this.start)/1000;
    for(const cue of this.cues) {
      if(!cue.done&&now>=cue.second){cue.done=true;cue.fn();}
    }
    return now;
  }
}
