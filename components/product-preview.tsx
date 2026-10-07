export function ProductPreview() {
  return (
    <div className="product-preview-card" aria-label="CaptionX Pro editor preview">
      <div className="preview-topbar"><div><span className="preview-brand-dot"/>CaptionX <b>Pro</b></div><span>Travel Vlog · Demo Project</span><button>Export</button></div>
      <div className="preview-body">
        <aside className="preview-sidebar">
          {['Upload','Auto Captions','Subtitles','Styles','Timeline','Audio'].map((item, index) => <div className={index===1 ? 'active' : ''} key={item}><span>{['↥','✦','T','Aa','≋','∿'][index]}</span>{item}</div>)}
        </aside>
        <section className="preview-stage-mini">
          <div className="preview-video-poster">
            <div className="preview-scene-glow one"/><div className="preview-scene-glow two"/>
            <div className="preview-person-silhouette"><span/></div>
            <div className="preview-caption">This place is absolutely <em>amazing</em><br/>and I can&apos;t believe we&apos;re actually here.</div>
          </div>
          <div className="preview-player-controls"><span>00:42 / 02:18</span><b>◀</b><b>▶</b><b>▶|</b><span>16:9</span></div>
        </section>
        <aside className="preview-inspector">
          <div className="preview-tabs"><b>Captions</b><span>Styles</span><span>Audio</span></div>
          <label>Caption Style</label><div className="preview-select">Modern <span>⌄</span></div>
          <div className="preview-style-row"><button>Aa</button><button className="active">Aa</button><button>Aa</button><button>Aa</button></div>
          <label>Text Color</label><div className="preview-dots"><i/><i/><i/><i/></div>
          <label>Opacity <b>80%</b></label><div className="preview-range"><span/></div>
          <label>Padding <b>16px</b></label><div className="preview-range shorter"><span/></div>
          <div className="preview-toggle"><span/>Show Safe Zones</div>
        </aside>
      </div>
      <div className="preview-timeline-mini">
        <div className="timeline-labels"><span>Captions</span><span>Audio</span><span>Video</span></div>
        <div className="timeline-content-mini"><div className="mini-ruler">00:00 <span>00:20</span><span>00:40</span><span>01:00</span><span>01:20</span></div><div className="mini-caption-row"><i>Welcome to CaptionX</i><i>This place is amazing</i><i>Crystal clear timing</i><i>Edit everything</i></div><div className="mini-waveform">{Array.from({length:70}).map((_,i)=><b key={i} style={{height:`${8 + ((i*13)%23)}px`}}/>)}</div><div className="mini-video-strip">{Array.from({length:12}).map((_,i)=><span key={i}/>)}</div><div className="mini-playhead"/></div>
      </div>
    </div>
  );
}
