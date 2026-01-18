import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

type AppStep = 'welcome' | 'cellar' | 'preferences' | 'analyzing' | 'result' | 'add-entry';

type AlcoholLevel = 'low' | 'medium' | 'high';

interface Preferences {
  sweetness: number; // 1-5
  sourness: number; // 1-5
  bitterness: number; // 1-5
  alcohol: AlcoholLevel;
  isRedWine: boolean;
  tannin: number; // 1-5, used if isRedWine is true
  customRequest: string;
}

interface RecommendationResult {
  drinkName: string;
  price?: string;
  description: string;
  matchPercentage: number;
  flavorProfile: string;
}

interface WineEntry {
  id: string;
  drinkName: string;
  barName: string;
  location: string;
  date: string;
  image: string | null; // Base64 of the drink
  notes: string;
  tags: string[];
}

// --- Icons (Inline SVG) ---

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
);

const WineIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"></path><path d="M7 10h10"></path><path d="M12 15v7"></path><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"></path></svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21h5v-5"></path></svg>
);

const ArchiveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);

const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const ChevronLeft = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);

// --- Components ---

const Logo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
    <h1 style={{ 
      fontFamily: 'Oswald, sans-serif', 
      fontSize: '4.5rem', 
      lineHeight: '0.8',
      color: 'var(--primary-gold)', 
      textTransform: 'uppercase',
      letterSpacing: '-0.03em',
      margin: 0,
      textAlign: 'center'
    }}>
      ONE SIP
    </h1>
    <span style={{ 
      fontFamily: 'Dancing Script, cursive', 
      fontSize: '2.5rem', 
      color: 'var(--primary-gold)', 
      transform: 'rotate(-6deg) translateY(-5px)',
      display: 'block'
    }}>
      at a time
    </span>
  </div>
);

const Slider = ({ label, value, onChange, min = 1, max = 5, leftLabel = "Low", rightLabel = "High" }: any) => (
  <div style={{ marginBottom: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ fontSize: '1.1rem', fontFamily: 'Oswald', fontWeight: 500, color: 'var(--text-main)', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>{value}/5</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', fontFamily: 'Inter' }}>
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  </div>
);

// --- Views ---

const WelcomeView = ({ onUpload, onOpenCellar }: { onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, onOpenCellar: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Logo />
      
      <div style={{ marginBottom: '32px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontFamily: 'Playfair Display', margin: 0 }}>
          <i>"Life is too short to drink bad wine."</i>
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button 
            className="btn-primary"
            style={{ padding: '18px', width: '100%', fontSize: '1.15rem' }}
            onClick={() => fileInputRef.current?.click()}
        >
            <CameraIcon />
            <span>Scan Menu to Find Match</span>
        </button>
        
        <button 
            className="btn-secondary"
            style={{ padding: '16px', width: '100%', fontSize: '1.15rem' }}
            onClick={onOpenCellar}
        >
            <ArchiveIcon />
            <span>My Cellar</span>
        </button>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={onUpload}
      />
    </div>
  );
};

// --- Add To Cellar View ---

const AddToCellarView = ({ 
  initialName, 
  tags, 
  onSave, 
  onCancel 
}: { 
  initialName: string, 
  tags: string[], 
  onSave: (entry: Omit<WineEntry, 'id'>) => void, 
  onCancel: () => void 
}) => {
  const [name, setName] = useState(initialName);
  const [barName, setBarName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleLocate = () => {
    if (navigator.geolocation) {
      setLocation('Locating...');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
      }, (err) => {
        setLocation('Location unavailable');
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        // Compress image before saving to avoid LocalStorage quota limits
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG with 0.7 quality
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setPhoto(compressedDataUrl);
            }
        };
        img.src = evt.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '400px', width: '90%', maxHeight: '90dvh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.8rem', fontFamily: 'Oswald', color: 'var(--text-main)' }}>ADD TO CELLAR</h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><CloseIcon /></button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: 'var(--primary-gold)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>The Drink</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you drinking?"
          style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: 'var(--primary-gold)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>The Place</label>
        <input 
          type="text" 
          value={barName} 
          onChange={(e) => setBarName(e.target.value)}
          placeholder="Bar Name"
          style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', marginBottom: '8px' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
            <input 
            type="text" 
            value={location} 
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / Area"
            style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }}
            />
            <button onClick={handleLocate} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'var(--primary-gold)', cursor: 'pointer', padding: '0 12px' }}>
                <LocationIcon />
            </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: 'var(--primary-gold)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>The Proof</label>
        <div 
            onClick={() => photoInputRef.current?.click()}
            style={{ 
                width: '100%', 
                height: '150px', 
                background: photo ? `url(${photo}) center/cover` : 'rgba(0,0,0,0.2)', 
                border: '1px dashed rgba(255,255,255,0.2)', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
            }}
        >
            {!photo && <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><CameraIcon /><span style={{fontSize: '0.8rem', marginTop: '8px'}}>Upload Drink Photo</span></div>}
        </div>
        <input type="file" ref={photoInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: 'var(--primary-gold)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Notes</label>
        <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How was it?"
            rows={3}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', fontFamily: 'Inter' }}
        />
      </div>

      <button 
        className="btn-primary" 
        style={{ width: '100%', padding: '16px' }}
        onClick={() => onSave({
            drinkName: name || 'Untitled Drink',
            barName: barName || 'Unknown Bar',
            location: location,
            date: new Date().toISOString(),
            image: photo,
            notes,
            tags
        })}
      >
        Check In Drink
      </button>
    </div>
  );
};

// --- Cellar View ---

const CellarView = ({ entries, onClose, onDelete, onAdd }: { entries: WineEntry[], onClose: () => void, onDelete: (id: string) => void, onAdd: () => void }) => {
    const [selectedEntry, setSelectedEntry] = useState<WineEntry | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const TOTAL_SLOTS = 12; // 3 cols * 4 rows = 12 slots, fits on one screen
    const slots = Array.from({ length: TOTAL_SLOTS });

    const handleExport = async () => {
      setIsGenerating(true);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Constants
        const COLS = 3;
        const MARGIN = 40;
        const CELL_GAP = 20;
        const CANVAS_WIDTH = 1200;
        const CELL_WIDTH = (CANVAS_WIDTH - (MARGIN * 2) - (CELL_GAP * (COLS - 1))) / COLS;
        const CELL_HEIGHT = 540; // Increased height from 450 to 540 to fit content better
        const HEADER_HEIGHT = 200;
        
        // Calculate dynamic height based on content
        const itemsToDraw = entries.length > 0 ? entries : [];
        const rows = Math.ceil((itemsToDraw.length || 1) / COLS);
        const CANVAS_HEIGHT = HEADER_HEIGHT + (rows * CELL_HEIGHT) + (rows * CELL_GAP) + MARGIN;

        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#6D251E');
        gradient.addColorStop(1, '#2C1810');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Pattern Overlay effect (Subtle)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for(let i=0; i<CANVAS_HEIGHT; i+=4) {
             ctx.fillRect(0, i, CANVAS_WIDTH, 1);
        }

        // Header Text
        ctx.fillStyle = '#F08C00';
        ctx.font = 'bold 80px Oswald';
        ctx.textAlign = 'center';
        ctx.fillText('MY CELLAR', CANVAS_WIDTH / 2, 100);

        ctx.fillStyle = '#D8C8B6';
        ctx.font = 'italic 30px Playfair Display';
        ctx.fillText(`Generated on ${new Date().toLocaleDateString()}`, CANVAS_WIDTH / 2, 170); // Moved down to 170 from 150

        // Load Images
        const imagePromises = itemsToDraw.map(entry => {
            return new Promise<HTMLImageElement | null>((resolve) => {
                if (!entry.image) {
                    resolve(null);
                    return;
                }
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = entry.image!;
            });
        });

        const loadedImages = await Promise.all(imagePromises);

        // Draw Grid
        itemsToDraw.forEach((entry, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = MARGIN + (col * (CELL_WIDTH + CELL_GAP));
            const y = HEADER_HEIGHT + (row * (CELL_HEIGHT + CELL_GAP));

            // Card BG
            ctx.fillStyle = '#FDF7E8';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;
            ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // Image Area
            const imgHeight = CELL_WIDTH; // Square image
            const img = loadedImages[i];
            
            if (img) {
                // Draw Image cropped to square
                const size = Math.min(img.width, img.height);
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, x, y, CELL_WIDTH, imgHeight);
            } else {
                // Placeholder
                ctx.fillStyle = '#EAEAEA';
                ctx.fillRect(x, y, CELL_WIDTH, imgHeight);
                ctx.fillStyle = '#CCCCCC';
                ctx.font = '50px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🍷', x + CELL_WIDTH/2, y + imgHeight/2 + 20);
            }

            // Text Area
            ctx.textAlign = 'left';
            const textPad = 20;
            
            // Name
            ctx.fillStyle = '#2C1810';
            ctx.font = 'bold 28px Oswald';
            let name = entry.drinkName;
            if (ctx.measureText(name).width > CELL_WIDTH - 40) {
                 // Simple truncation
                 while (ctx.measureText(name + '...').width > CELL_WIDTH - 40 && name.length > 0) {
                     name = name.slice(0, -1);
                 }
                 name += '...';
            }
            ctx.fillText(name, x + textPad, y + imgHeight + 50);

            // Bar Name
            ctx.fillStyle = '#F08C00';
            ctx.font = '600 20px Inter';
            ctx.fillText(entry.barName.toUpperCase(), x + textPad, y + imgHeight + 90);

            // Date
            ctx.fillStyle = '#666666';
            ctx.font = '18px Inter';
            ctx.fillText(new Date(entry.date).toLocaleDateString(), x + textPad, y + imgHeight + 130); // Moved to +130
        });

        // Add "Empty" Text if no wines
        if (itemsToDraw.length === 0) {
             ctx.fillStyle = 'rgba(255,255,255,0.1)';
             ctx.font = 'italic 40px Playfair Display';
             ctx.textAlign = 'center';
             ctx.fillText("The cellar is waiting for its first bottle.", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 50);
        }

        // Export
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        let handled = false;

        // Try Native Share
        if (navigator.share && navigator.canShare) {
             const blob = await (await fetch(dataUrl)).blob();
             const file = new File([blob], "sipwise-cellar.jpg", { type: "image/jpeg" });
             const shareData = {
                 title: 'My SipWise Cellar',
                 text: 'Check out my wine collection on SipWise!',
                 files: [file]
             };

             if (navigator.canShare(shareData)) {
                 try {
                    await navigator.share(shareData);
                    handled = true;
                 } catch (err: any) {
                     if (err.name === 'AbortError') {
                         handled = true; // User cancelled, we consider this handled.
                     } else {
                         console.warn("Share failed", err);
                         // Fallback to download
                     }
                 }
             }
        }

        // Fallback to Download
        if (!handled) {
             const link = document.createElement('a');
             link.download = 'sipwise-cellar.jpg';
             link.href = dataUrl;
             link.target = "_blank";
             link.click();
        }

      } catch (e) {
        console.error("Export failed", e);
        alert("Could not export image.");
      } finally {
        setIsGenerating(false);
      }
    };
  
    return (
      <div className="cabinet-container" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft /></button>
                <h2 style={{ fontFamily: 'Oswald', textTransform: 'uppercase', fontSize: '1.2rem', margin: 0, color: 'var(--primary-gold)' }}>The Wine Cabinet</h2>
            </div>
            <button 
                onClick={handleExport} 
                disabled={isGenerating}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: isGenerating ? '#999' : 'var(--primary-gold)', cursor: isGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {isGenerating ? <div className="scan-line" style={{position:'static', width: '12px', height:'12px', borderRadius: '50%'}}></div> : <DownloadIcon />}
            </button>
        </div>
  
        {/* Cabinet Grid */}
        <div style={{ flex: 1, padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gridTemplateRows: 'repeat(4, 1fr)',
                gap: '24px 12px',
                height: '100%',
                maxHeight: '100%'
            }}>
                {slots.map((_, index) => {
                    const entry = entries[index];
                    return (
                        <div key={index} className="shelf-row" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                            {entry ? (
                                <div 
                                    onClick={() => setSelectedEntry(entry)}
                                    className="animate-fade-in"
                                    style={{ 
                                        background: '#FFF', 
                                        borderRadius: '2px', 
                                        padding: '4px 4px 6px 4px', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                                        cursor: 'pointer',
                                        transform: 'translateY(-6px)',
                                        height: '90%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div style={{ 
                                        flex: 1,
                                        background: entry.image ? `url(${entry.image}) center/cover` : '#EAEAEA', 
                                        borderRadius: '1px',
                                        marginBottom: '4px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        minHeight: 0
                                    }}>
                                        {!entry.image && <span style={{fontSize: '1.2rem'}}>🍷</span>}
                                    </div>
                                    <h3 style={{ color: '#333', fontSize: '0.6rem', fontFamily: 'Oswald', margin: '0 0 1px 0', lineHeight: '1.1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.drinkName}</h3>
                                    <p style={{ color: '#888', fontSize: '0.5rem', margin: 0 }}>{new Date(entry.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</p>
                                </div>
                            ) : (
                                <div 
                                    className="empty-slot" 
                                    onClick={onAdd}
                                    style={{ height: '80%', opacity: 0.5, cursor: 'pointer', position: 'relative' }}
                                >
                                    <div style={{ transform: 'scale(0.7)' }}>
                                        <WineIcon />
                                    </div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--primary-gold)', opacity: 0.9 }}>
                                        <PlusIcon />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {entries.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Playfair Display', pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    <p style={{ fontSize: '1.2rem' }}>Tap a slot to<br/>add your first bottle.</p>
                </div>
            )}
        </div>
  
        {/* Detail Modal */}
        {selectedEntry && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '360px', padding: '0', overflow: 'hidden', background: '#FDF7E8' }}>
                    <div style={{ height: '240px', background: selectedEntry.image ? `url(${selectedEntry.image}) center/cover` : '#333', position: 'relative' }}>
                        <button 
                            onClick={() => setSelectedEntry(null)} 
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                            <CloseIcon />
                        </button>
                    </div>
                    <div style={{ padding: '24px', color: '#333' }}>
                        <h2 style={{ fontFamily: 'Oswald', fontSize: '2rem', color: '#2C2C2C', lineHeight: '1', marginBottom: '8px' }}>{selectedEntry.drinkName}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-gold)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase' }}>
                            <LocationIcon /> {selectedEntry.barName}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '16px', borderBottom: '1px solid #E0E0E0', paddingBottom: '16px' }}>
                            {selectedEntry.location} • {new Date(selectedEntry.date).toLocaleDateString()}
                        </p>
                        
                        {selectedEntry.notes && (
                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ fontFamily: 'Dancing Script', fontSize: '1.4rem', color: '#555', margin: 0 }}>
                                    "{selectedEntry.notes}"
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
                            {selectedEntry.tags.map((tag, i) => (
                                <span key={i} style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#EAEAEA', color: '#555', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>{tag}</span>
                            ))}
                        </div>

                        <button 
                            onClick={() => {
                                onDelete(selectedEntry.id);
                                setSelectedEntry(null);
                            }}
                            style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #D8C8B6', color: '#999', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            Remove from Cellar
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
};

const PreferencesView = ({ prefs, setPrefs, onSearch }: PreferencesViewProps) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '32px 24px', maxWidth: '400px', width: '90%', maxHeight: '90dvh', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-main)', textAlign: 'center', fontFamily: 'Oswald', textTransform: 'uppercase' }}>Your Palette</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.9rem' }}>Tell us what you're in the mood for</p>
      
      <div 
        style={{ 
          display: 'flex', 
          background: 'rgba(0,0,0,0.2)', 
          padding: '4px', 
          borderRadius: '8px',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <div 
          onClick={() => setPrefs(p => ({ ...p, isRedWine: false }))}
          style={{ 
            flex: 1, 
            textAlign: 'center', 
            padding: '12px', 
            borderRadius: '6px',
            background: !prefs.isRedWine ? 'var(--primary-gold)' : 'transparent',
            color: !prefs.isRedWine ? '#FFF' : 'var(--text-muted)',
            fontWeight: !prefs.isRedWine ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontFamily: 'Oswald',
            letterSpacing: '0.05em'
          }}
        >
          COCKTAIL / WHITE
        </div>
        <div 
          onClick={() => setPrefs(p => ({ ...p, isRedWine: true }))}
          style={{ 
            flex: 1, 
            textAlign: 'center', 
            padding: '12px', 
            borderRadius: '6px',
            background: prefs.isRedWine ? 'var(--accent-dark)' : 'transparent',
            color: prefs.isRedWine ? '#FFF' : 'var(--text-muted)',
            fontWeight: prefs.isRedWine ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontFamily: 'Oswald',
            letterSpacing: '0.05em'
          }}
        >
          RED WINE
        </div>
      </div>

      <Slider 
        label="Sweetness" 
        value={prefs.sweetness} 
        onChange={(v: number) => setPrefs(p => ({ ...p, sweetness: v }))}
        leftLabel="Dry" rightLabel="Sweet"
      />
      
      <Slider 
        label="Sourness / Acidity" 
        value={prefs.sourness} 
        onChange={(v: number) => setPrefs(p => ({ ...p, sourness: v }))}
        leftLabel="Flat" rightLabel="Tart"
      />
      
      <Slider 
        label="Bitterness" 
        value={prefs.bitterness} 
        onChange={(v: number) => setPrefs(p => ({ ...p, bitterness: v }))}
        leftLabel="Smooth" rightLabel="Bitter"
      />

      {prefs.isRedWine && (
        <Slider 
          label="Tannins" 
          value={prefs.tannin} 
          onChange={(v: number) => setPrefs(p => ({ ...p, tannin: v }))}
          leftLabel="Soft" rightLabel="Chewy"
        />
      )}

      <div style={{ marginBottom: '32px' }}>
        <span style={{ fontSize: '1.1rem', fontFamily: 'Oswald', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '12px', letterSpacing: '0.05em' }}>Alcohol Strength</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['low', 'medium', 'high'].map((level) => (
            <button
              key={level}
              onClick={() => setPrefs(p => ({ ...p, alcohol: level as AlcoholLevel }))}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid ' + (prefs.alcohol === level ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)'),
                background: prefs.alcohol === level ? 'rgba(240, 140, 0, 0.15)' : 'transparent',
                color: prefs.alcohol === level ? 'var(--primary-gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontWeight: prefs.alcohol === level ? 600 : 400,
                fontSize: '0.85rem',
                fontFamily: 'Oswald',
                letterSpacing: '0.05em'
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <span style={{ fontSize: '1.1rem', fontFamily: 'Oswald', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '12px', letterSpacing: '0.05em' }}>Special Request</span>
        <input 
          type="text"
          value={prefs.customRequest}
          onChange={(e) => setPrefs(p => ({ ...p, customRequest: e.target.value }))}
          placeholder='e.g., "Something fruity", "No cilantro"'
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.2)',
            color: 'var(--text-main)',
            outline: 'none',
            boxSizing: 'border-box',
            fontSize: '1rem',
            fontFamily: 'Inter'
          }}
        />
      </div>

      <button 
        className="btn-primary"
        style={{ width: '100%', padding: '18px', fontSize: '1.1rem' }}
        onClick={onSearch}
      >
        Find My Drink
      </button>
    </div>
  );
};

interface PreferencesViewProps {
  prefs: Preferences;
  setPrefs: React.Dispatch<React.SetStateAction<Preferences>>;
  onSearch: () => void;
}

const AnalyzingView = ({ image }: { image: string | null }) => (
  <div style={{ textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ 
      position: 'relative', 
      width: '240px', 
      height: '340px', 
      borderRadius: '8px', 
      overflow: 'hidden', 
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      border: '4px solid #FFF'
    }}>
      <img 
        src={image!} 
        alt="Menu" 
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.2) contrast(1.1)' }} 
      />
      <div className="scan-line"></div>
    </div>
    <p style={{ marginTop: '32px', fontSize: '1.5rem', fontFamily: 'Dancing Script', color: 'var(--text-main)', fontWeight: 700 }}>
      The sommelier is thinking...
    </p>
  </div>
);

interface ResultViewProps {
  result: RecommendationResult | null;
  onReset: () => void;
  onRefine: (type: string) => void;
  onAddToCellar: () => void;
}

const ResultView = ({ result, onReset, onRefine, onAddToCellar }: ResultViewProps) => (
  <div className="glass-panel animate-fade-in" style={{ padding: '0', maxWidth: '400px', width: '90%', overflow: 'hidden', border: 'none', background: '#FDF7E8' }}>
    <div style={{ height: '200px', background: 'linear-gradient(to bottom, #42120D, #6D251E)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '70px', opacity: 1 }}>🍷</div>
      <div style={{ 
        position: 'absolute', 
        bottom: '16px', 
        right: '16px', 
        background: '#FFF', 
        color: '#6D251E', 
        padding: '6px 14px', 
        borderRadius: '4px', 
        fontWeight: 'bold',
        fontSize: '0.9rem',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        fontFamily: 'Oswald'
      }}>
        {result?.matchPercentage}% Match
      </div>
    </div>
    
    <div style={{ padding: '24px', color: '#333', paddingBottom: '32px' }}>
      <h2 style={{ fontSize: '2.2rem', lineHeight: '1', marginBottom: '8px', color: '#2C2C2C', fontFamily: 'Oswald', textTransform: 'uppercase' }}>
        {result?.drinkName}
      </h2>
      {result?.price && (
        <p style={{ color: 'var(--primary-gold)', fontSize: '1.2rem', marginBottom: '16px', fontWeight: 'bold', fontFamily: 'Oswald' }}>{result.price}</p>
      )}
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {result?.flavorProfile.split(',').map((tag, i) => (
            <span key={i} style={{ 
              fontSize: '0.7rem', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              background: '#f0e6d2',
              border: '1px solid #e0d0b0',
              color: '#5a4a3a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600
            }}>
              {tag.trim()}
            </span>
        ))}
      </div>

      <div style={{ 
        background: '#FFF', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        borderLeft: '4px solid var(--primary-gold)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <p style={{ fontStyle: 'italic', color: '#555', lineHeight: '1.6', margin: 0, fontSize: '1rem', fontFamily: 'Playfair Display' }}>
          "{result?.description}"
        </p>
      </div>

      <button 
        className="btn-primary"
        style={{ width: '100%', padding: '16px', marginBottom: '24px', fontSize: '1rem' }}
        onClick={onAddToCellar}
      >
        <PlusIcon /> Check In / Save to Cellar
      </button>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '12px' }}>
          Not quite right?
        </p>
        <div className="chip-grid">
          <button className="btn-chip" onClick={() => onRefine("Stronger / More Alcohol")}>Stronger</button>
          <button className="btn-chip" onClick={() => onRefine("Lighter / Less Alcohol")}>Lighter</button>
          <button className="btn-chip" onClick={() => onRefine("Sweeter / Fruity")}>Sweeter</button>
          <button className="btn-chip" onClick={() => onRefine("Surprise me with something different")}>Surprise Me</button>
        </div>
      </div>

      <button 
        className="btn-secondary"
        onClick={onReset}
        style={{ width: '100%', padding: '16px' }}
      >
        <RefreshIcon />
        <span>Select Another</span>
      </button>
    </div>
  </div>
);

// --- Main App ---

const App = () => {
  const [step, setStep] = useState<AppStep>('welcome');
  const [image, setImage] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({
    sweetness: 3,
    sourness: 2,
    bitterness: 1,
    alcohol: 'medium',
    isRedWine: false,
    tannin: 3,
    customRequest: '',
  });
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [cellar, setCellar] = useState<WineEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('sipwise-cellar');
    if (saved) {
        try {
            setCellar(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse cellar", e);
        }
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('sipwise-cellar', JSON.stringify(cellar));
    } catch (e) {
        console.error("Failed to save to localStorage", e);
        alert("Warning: Storage full. This drink might not be saved permanently. Try deleting old entries.");
    }
  }, [cellar]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null); 
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImage(evt.target?.result as string);
        setStep('preferences');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setResult(null);
    setImage(null);
    setStep('welcome');
  };

  const addToCellar = (entryData: Omit<WineEntry, 'id'>) => {
    const newEntry: WineEntry = {
        ...entryData,
        id: Date.now().toString(),
    };
    setCellar(prev => [newEntry, ...prev]);
    setStep('cellar');
  };

  const deleteFromCellar = (id: string) => {
      setCellar(prev => prev.filter(item => item.id !== id));
  };

  const handleManualAdd = () => {
    setResult(null);
    setStep('add-entry');
  };

  const getRecommendation = async (refinementInstruction?: string) => {
    if (!image) return;
    setStep('analyzing');

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image,
            prefs,
            refinementInstruction,
            previousResult: result
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendation');
      }

      const data = await response.json();
      setResult(data);
      setStep('result');

    } catch (error) {
      console.error(error);
      alert("Something went wrong analyzing the menu. Please try again.");
      setStep('preferences');
    }
  };

  const handleRefine = (instruction: string) => {
    getRecommendation(instruction);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100dvh', 
      width: '100%',
      padding: (step === 'cellar' || step === 'analyzing') ? 0 : '20px 0'
    }}>
      {step === 'welcome' && <WelcomeView onUpload={handleImageUpload} onOpenCellar={() => setStep('cellar')} />}
      
      {step === 'cellar' && <CellarView entries={cellar} onClose={() => setStep('welcome')} onDelete={deleteFromCellar} onAdd={handleManualAdd} />}
      
      {step === 'preferences' && <PreferencesView prefs={prefs} setPrefs={setPrefs} onSearch={() => getRecommendation()} />}
      
      {step === 'analyzing' && <AnalyzingView image={image} />}
      
      {step === 'result' && (
        <ResultView 
            result={result} 
            onReset={handleReset} 
            onRefine={handleRefine} 
            onAddToCellar={() => setStep('add-entry')}
        />
      )}

      {step === 'add-entry' && (
          <AddToCellarView 
            initialName={result?.drinkName || ''} 
            tags={result?.flavorProfile ? result.flavorProfile.split(',') : []}
            onSave={addToCellar}
            onCancel={() => result ? setStep('result') : setStep('cellar')}
          />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);