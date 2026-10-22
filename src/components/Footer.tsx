import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '64px 0 40px 0', marginTop: '60px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '40px', marginBottom: '48px' }}>
          {/* Brand Colophon */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="brand-mark" style={{ width: '32px', height: '32px' }}>
                <Sparkles size={16} style={{ color: 'var(--amber-primary)' }} />
              </div>
              <span className="brand-name" style={{ fontSize: '1.15rem' }}>StoryCanvas</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '340px' }}>
              A sanctuary for visual storytelling, pairing AI-rendered masterwork paintings with human-grade spoken story narration.
            </p>
          </div>

          {/* Editorial Curation Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
              Aesthetic Principles
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <li>• Deep Charcoal & Restrained Amber</li>
              <li>• High-contrast Classical Editorial Serif</li>
              <li>• Museum-grade Edge-to-Edge Artwork</li>
              <li>• Waveform Audio & Spoken Narration</li>
            </ul>
          </div>

          {/* Reference Design Tribute */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
              Design Influences
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Synthesized from seven inspirational design studies:
              Literal Club (Typography), Voicenotes (Audio Notes), SoundCloud (Waveforms), Recraft (Art Gallery), Variant (Styles), Base44 (Studio Studio), and Plane (Editorial Hierarchy).
            </p>
          </div>
        </div>

        {/* Bottom Line */}
        <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div>
            © {new Date().getFullYear()} StoryCanvas Studio. Crafted with meticulous typography and spoken cadence.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Curated with</span>
            <Heart size={12} fill="var(--cinnabar)" color="var(--cinnabar)" />
            <span>for discerning readers and listeners</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
