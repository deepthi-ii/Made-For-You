import React from 'react';
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, AudioLines, Check, ChevronDown, Copy, Gift, Heart, ImagePlus,
  LockKeyhole, Mail, Menu, Mic, Music2, Plus, Send, Sparkles, Upload, X
} from "lucide-react";
import { supabase, supabaseConfigured, uploadGiftFile } from "./lib/supabase";

const CATEGORIES = [
  { id: "birthday", label: "Birthday", icon: "🎂", subtitle: "Make their day unforgettable" },
  { id: "anniversary", label: "Anniversary", icon: "💞", subtitle: "Celebrate your story" },
  { id: "confession", label: "Confession", icon: "💌", subtitle: "Say what your heart means" }
];
const TYPES = [
  { id: "letter", label: "Letters", icon: "✉", desc: "Words from your heart" },
  { id: "polaroids", label: "Polaroids", icon: "▣", desc: "Little moments to keep" },
  { id: "cards", label: "Greeting cards", icon: "♡", desc: "A card made just for them" }
];
const FILTERS = [
  { id: "none", label: "Original", css: "none" },
  { id: "warm", label: "Warm", css: "sepia(.22) saturate(1.2)" },
  { id: "rose", label: "Rose", css: "sepia(.12) hue-rotate(315deg) saturate(1.25)" },
  { id: "mono", label: "Mono", css: "grayscale(1)" },
  { id: "dreamy", label: "Dreamy", css: "brightness(1.08) saturate(.8) contrast(.92)" }
];

const blankMemory = () => ({ id: crypto.randomUUID(), caption: "", file: null, preview: "", filter: "none", message: "" });

function makeSlug() {
  return `${Math.random().toString(36).slice(2, 7)}-${Math.random().toString(36).slice(2, 6)}`;
}
function showDate(date) {
  if (!date) return "Your special day";
  return new Date(date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function App() {
  const [routeGift, setRouteGift] = useState(() => new URLSearchParams(location.search).get("gift"));
  const [view, setView] = useState("home");
  const [category, setCategory] = useState("birthday");
  const [contentType, setContentType] = useState("polaroids");
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [letter, setLetter] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [password, setPassword] = useState("");
  const [protectGift, setProtectGift] = useState(false);
  const [memories, setMemories] = useState([blankMemory()]);
  const [voiceFile, setVoiceFile] = useState(null);
  const [musicFile, setMusicFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [openedGift, setOpenedGift] = useState(null);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [filterMemory, setFilterMemory] = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  const photoInput = useRef(null);
  const voiceInput = useRef(null);
  const musicInput = useRef(null);
  const videoInput = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const onPop = () => {
      const id = new URLSearchParams(location.search).get("gift");
      setRouteGift(id);
      setView(id ? "recipient" : "home");
    };
    window.addEventListener("popstate", onPop);
    if (routeGift) {
      setView("recipient");
      loadGift(routeGift);
    }
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const chosenCategory = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  function notify(text) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 4000);
  }

  async function loadGift(id) {
    if (!supabaseConfigured) {
      setOpenedGift({ unavailable: true, title: "This gift needs its Supabase connection", id });
      return;
    }
    const { data, error } = await supabase.from("gifts").select("*").eq("slug", id).maybeSingle();
    if (error || !data) {
      setOpenedGift({ unavailable: true, title: "We couldn't find this gift", id });
      return;
    }
    setOpenedGift(data);
    setUnlocked(!data.password_hash);
  }

  function startCreate(cat = "birthday", type = "polaroids") {
    setCategory(cat);
    setContentType(type);
    setView("create");
    setCreatedUrl("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateMemory(id, patch) {
    setMemories(old => old.map(m => m.id === id ? { ...m, ...patch } : m));
  }

  function addPhotos(files) {
    const valid = Array.from(files || []).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setMemories(old => {
      const keep = old.filter(m => m.file || m.caption || m.preview);
      return [...keep, ...valid.map(file => ({
        ...blankMemory(), file, preview: URL.createObjectURL(file), caption: file.name.replace(/\.[^.]+$/, "")
      }))];
    });
    setContentType("polaroids");
    notify(`${valid.length} photo${valid.length === 1 ? "" : "s"} added to your memories.`);
  }

  async function createGift(e) {
    e.preventDefault();
    if (!recipient.trim()) return notify("Add the name of the person receiving your gift.");
    if (protectGift && !password.trim()) return notify("Choose a password for this gift.");
    setBusy(true);
    try {
      const slug = makeSlug();
      let uploadedMemories = [];
      let voiceUrl = "";
      let musicUrl = "";
      let videoUrl = "";

      if (supabaseConfigured) {
        const memoryList = memories.filter(m => m.file || m.caption.trim() || m.message.trim());
        for (const memory of memoryList) {
          let imageUrl = "";
          if (memory.file) imageUrl = (await uploadGiftFile(memory.file, slug, "photos")).url;
          uploadedMemories.push({ caption: memory.caption, message: memory.message, image_url: imageUrl, filter: memory.filter });
        }
        if (voiceFile) voiceUrl = (await uploadGiftFile(voiceFile, slug, "audio")).url;
        if (musicFile) musicUrl = (await uploadGiftFile(musicFile, slug, "audio")).url;
        if (videoFile) videoUrl = (await uploadGiftFile(videoFile, slug, "video")).url;

        const payload = {
          slug,
          category,
          content_type: contentType,
          sender_name: sender.trim() || "Someone who cares",
          recipient_name: recipient.trim(),
          title: title.trim() || `${chosenCategory.label} wishes for ${recipient.trim()}`,
          event_date: eventDate || null,
          letter: letter.trim(),
          card_message: cardMessage.trim(),
          secret_message: secret.trim(),
          password_hash: protectGift ? password.trim() : null,
          memories: uploadedMemories,
          voice_url: voiceUrl || null,
          music_url: musicUrl || null,
          video_url: videoUrl || null
        };
        const { error } = await supabase.from("gifts").insert(payload);
        if (error) throw error;
      } else {
        // Preview mode is useful before configuring Supabase, but does not publish a persistent gift.
        const previewGift = {
          slug, category, content_type: contentType,
          sender_name: sender.trim() || "Someone who cares",
          recipient_name: recipient.trim(),
          title: title.trim() || `${chosenCategory.label} wishes for ${recipient.trim()}`,
          event_date: eventDate || null, letter, card_message: cardMessage,
          secret_message: secret, password_hash: protectGift ? password.trim() : null,
          memories: memories.filter(m => m.file || m.caption.trim() || m.message.trim()).map(m => ({
            caption: m.caption, message: m.message, image_url: m.preview, filter: m.filter
          })),
          voice_url: voiceFile ? URL.createObjectURL(voiceFile) : null,
          music_url: musicFile ? URL.createObjectURL(musicFile) : null,
          video_url: videoFile ? URL.createObjectURL(videoFile) : null,
          local_preview: true
        };
        sessionStorage.setItem(`mfy-preview-${slug}`, JSON.stringify(previewGift));
      }
      const url = `${location.origin}${location.pathname}?gift=${slug}`;
      setCreatedUrl(url);
      setView("created");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      notify(err.message || "Couldn't save the gift. Check Supabase setup and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(createdUrl);
      notify("Gift link copied. Send it to your favourite person 💗");
    } catch {
      notify("Copy this link: " + createdUrl);
    }
  }

  async function unlockGift(e) {
    e.preventDefault();
    if (!openedGift) return;
    if (openedGift.local_preview) {
      if ((openedGift.password_hash || "").toLowerCase() === unlockInput.trim().toLowerCase()) setUnlocked(true);
      else notify("That password doesn't match.");
      return;
    }
    if ((openedGift.password_hash || "").toLowerCase() === unlockInput.trim().toLowerCase()) {
      setUnlocked(true);
    } else notify("That password doesn't match.");
  }

  async function openFromUrl(id) {
    setRouteGift(id);
    setView("recipient");
    history.pushState({}, "", `?gift=${encodeURIComponent(id)}`);
    const local = sessionStorage.getItem(`mfy-preview-${id}`);
    if (local) {
      const gift = JSON.parse(local);
      setOpenedGift(gift);
      setUnlocked(!gift.password_hash);
    } else {
      await loadGift(id);
    }
  }

  function resetHome() {
    history.pushState({}, "", location.pathname);
    setRouteGift(null);
    setView("home");
    setOpenedGift(null);
    setUnlocked(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeMemories = openedGift?.memories || [];
  const currentMemory = activeMemories[filterMemory] || activeMemories[0];
  const canSaveLive = supabaseConfigured;

  return (
    <div className="site-shell">
      <header className="topbar">
        <button className="wordmark" onClick={resetHome} aria-label="Made For You home"><span className="wordmark-heart">♡</span> made <em>for you</em></button>
        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <a href="#how" onClick={() => setMobileMenu(false)}>How it works</a>
          <a href="#occasions" onClick={() => setMobileMenu(false)}>Occasions</a>
          <button className="nav-create" onClick={() => startCreate()}>Create a gift <ArrowRight size={15}/></button>
        </nav>
        <button className="menu-button" onClick={() => setMobileMenu(v => !v)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
      </header>

      {view === "home" && <Home startCreate={startCreate} setCategory={setCategory} />}
      {view === "create" && (
        <CreateGift
          category={category} setCategory={setCategory} contentType={contentType} setContentType={setContentType}
          sender={sender} setSender={setSender} recipient={recipient} setRecipient={setRecipient}
          title={title} setTitle={setTitle} eventDate={eventDate} setEventDate={setEventDate}
          letter={letter} setLetter={setLetter} cardMessage={cardMessage} setCardMessage={setCardMessage}
          secret={secret} setSecret={setSecret} password={password} setPassword={setPassword}
          protectGift={protectGift} setProtectGift={setProtectGift} memories={memories}
          updateMemory={updateMemory} addPhotos={addPhotos} photoInput={photoInput}
          voiceFile={voiceFile} setVoiceFile={setVoiceFile} voiceInput={voiceInput}
          musicFile={musicFile} setMusicFile={setMusicFile} musicInput={musicInput}
          videoFile={videoFile} setVideoFile={setVideoFile} videoInput={videoInput}
          createGift={createGift} busy={busy} canSaveLive={canSaveLive} notify={notify}
          resetHome={resetHome}
        />
      )}
      {view === "created" && <CreatedGift url={createdUrl} copyLink={copyLink} resetHome={resetHome} canSaveLive={canSaveLive} />}
      {view === "recipient" && <RecipientGift gift={openedGift} unlocked={unlocked} unlockInput={unlockInput} setUnlockInput={setUnlockInput} unlockGift={unlockGift} showLetter={showLetter} setShowLetter={setShowLetter} currentMemory={currentMemory} filterMemory={filterMemory} setFilterMemory={setFilterMemory} showSecret={showSecret} setShowSecret={setShowSecret} musicPlaying={musicPlaying} setMusicPlaying={setMusicPlaying} audioRef={audioRef} resetHome={resetHome} openFromUrl={openFromUrl} />}

      <footer className="footer">
        <button className="wordmark" onClick={resetHome}><span className="wordmark-heart">♡</span> made <em>for you</em></button>
        <p>Little things. Big feelings. Made just for someone.</p>
        <span>MADE WITH ♡, ALWAYS.</span>
      </footer>
      {notice && <div className="toast" role="status">{notice}</div>}
      <audio ref={audioRef} onPlay={() => setMusicPlaying(true)} onPause={() => setMusicPlaying(false)} />
    </div>
  );

  function Home({ startCreate, setCategory }) {
    return (
      <>
        <main>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles size={14}/> A LITTLE SOMETHING, JUST FOR THEM</span>
              <h1>Some feelings<br/>deserve to be <span>wrapped in love.</span></h1>
              <p>Turn your favourite memories, heartfelt words, and little voice notes into a digital gift they can keep forever.</p>
              <div className="hero-actions">
                <button className="btn-primary" onClick={() => startCreate("birthday", "polaroids")}>Create your gift <ArrowRight size={17}/></button>
                <a className="text-link" href="#how">See how it works <span>↓</span></a>
              </div>
              <div className="made-note"><span className="tiny-heart">♡</span> Made for your favourite human.</div>
            </div>
            <div className="hero-art" aria-label="Digital scrapbook preview">
              <div className="hero-orbit"></div>
              <div className="sticker sticker-one">✦</div><div className="sticker sticker-two">♡</div><div className="sticker sticker-three">✿</div>
              <div className="polaroid p-back"><div className="sample-photo sample-lilac">✿</div><span>the little moments</span></div>
              <div className="polaroid p-front"><div className="sample-photo sample-pink"><span>my favourite<br/>human</span><b>♡</b></div><span>kept close, always</span></div>
              <div className="floating-note"><span>♡</span><div><b>a gift from the heart</b><small>made just for you</small></div></div>
            </div>
          </section>

          <section className="occasion-section" id="occasions">
            <div className="section-top"><div><span className="eyebrow">WHAT ARE WE CELEBRATING?</span><h2>Every feeling has <span>a little place.</span></h2></div><p>Pick the occasion. Make it personal. Send a little piece of your heart.</p></div>
            <div className="occasion-grid">
              {CATEGORIES.map((c, i) => <button className={`occasion-card occasion-${i}`} key={c.id} onClick={() => { setCategory(c.id); startCreate(c.id, "polaroids"); }}>
                <span className="occasion-number">0{i+1}</span><span className="occasion-icon">{c.icon}</span><h3>{c.label}</h3><p>{c.subtitle}</p><span className="occasion-arrow"><ArrowRight size={18}/></span>
              </button>)}
            </div>
          </section>

          <section className="how-section" id="how">
            <div className="how-heading"><span className="eyebrow">IT'S THE THOUGHT THAT COUNTS</span><h2>Little steps.<br/><span>Lasting feelings.</span></h2></div>
            <div className="steps-grid">
              <div className="step"><span>01</span><div className="step-icon"><ImagePlus/></div><h3>Collect your moments</h3><p>Add photos, captions, a letter, a voice note, or a video that means something.</p></div>
              <div className="step"><span>02</span><div className="step-icon"><Heart/></div><h3>Make it yours</h3><p>Choose filters, frames, colours, and words that feel like your relationship.</p></div>
              <div className="step"><span>03</span><div className="step-icon"><Gift/></div><h3>Wrap it in a link</h3><p>Save your gift and share a special link. They open it and discover everything.</p></div>
            </div>
          </section>

          <section className="cta-band"><div><span className="eyebrow">YOUR PERSON IS GOING TO LOVE THIS</span><h2>Go on. Make them feel special.</h2><p>Some things are too lovely to leave unsaid.</p></div><button className="btn-primary" onClick={() => startCreate("birthday", "polaroids")}>Make a little magic <Heart size={17}/></button><span className="cta-heart">♡</span></section>
        </main>
      </>
    );
  }
}

function CreateGift(props) {
  const {
    category, setCategory, contentType, setContentType, sender, setSender, recipient, setRecipient,
    title, setTitle, eventDate, setEventDate, letter, setLetter, cardMessage, setCardMessage,
    secret, setSecret, password, setPassword, protectGift, setProtectGift, memories, updateMemory,
    addPhotos, photoInput, voiceFile, setVoiceFile, voiceInput, musicFile, setMusicFile, musicInput,
    videoFile, setVideoFile, videoInput, createGift, busy, canSaveLive, notify, resetHome
  } = props;
  const [editingId, setEditingId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recorderSupported] = useState(() => typeof MediaRecorder !== "undefined");
  const recorder = useRef(null);
  const chunks = useRef([]);
  const selectedCategory = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  async function beginRecording() {
    if (!recorderSupported) return notify("Voice recording isn't supported in this browser. Upload an audio file instead.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder.current = new MediaRecorder(stream);
      chunks.current = [];
      recorder.current.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      recorder.current.onstop = () => {
        setVoiceFile(new File(chunks.current, "voice-message.webm", { type: "audio/webm" }));
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
        notify("Your voice message is ready.");
      };
      recorder.current.start();
      setRecording(true);
    } catch {
      notify("Please allow microphone access, or upload a voice message instead.");
    }
  }
  function stopRecording() { if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop(); }

  return (
    <main className="builder-page">
      <div className="builder-header"><button className="back-link" onClick={resetHome}>← Back home</button><span className="eyebrow">YOUR LITTLE GIFT STUDIO</span><h1>Make it <span>mean something.</span></h1><p>Every detail is a little way of saying, “I thought of you.”</p></div>
      <div className="builder-layout">
        <form className="builder-form" onSubmit={createGift}>
          <section className="form-panel">
            <div className="panel-title"><span className="panel-step">01</span><div><h2>Choose your occasion</h2><p>Start with what you're celebrating.</p></div></div>
            <div className="category-picker">{CATEGORIES.map(c => <button type="button" key={c.id} className={category === c.id ? "category-choice selected" : "category-choice"} onClick={() => setCategory(c.id)}><span>{c.icon}</span><b>{c.label}</b></button>)}</div>
            <div className="type-picker">{TYPES.map(t => <button type="button" key={t.id} className={contentType === t.id ? "type-choice selected" : "type-choice"} onClick={() => setContentType(t.id)}><span>{t.icon}</span><b>{t.label}</b><small>{t.desc}</small></button>)}</div>
          </section>

          <section className="form-panel">
            <div className="panel-title"><span className="panel-step">02</span><div><h2>Who is it for?</h2><p>Let's put their name on something lovely.</p></div></div>
            <div className="field-grid">
              <label>Your name<input value={sender} onChange={e => setSender(e.target.value)} placeholder="The person sending this"/></label>
              <label>Their name *<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="The lucky human" required maxLength={80}/></label>
              <label className="field-full">Gift title<input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${selectedCategory.label} wishes, made with love`} maxLength={120}/></label>
              <label className="field-full">Special date (optional)<input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}/></label>
            </div>
          </section>

          {contentType === "letter" && <section className="form-panel">
            <div className="panel-title"><span className="panel-step">03</span><div><h2>Write from your heart</h2><p>It doesn't have to be perfect. It just has to be yours.</p></div></div>
            <label className="full-label">Your letter<textarea rows="9" value={letter} onChange={e => setLetter(e.target.value)} placeholder={`Dear ${recipient || "my favourite person"},\n\nThere's something I want you to know...`} maxLength={8000}/><small>{letter.length}/8000 characters</small></label>
          </section>}

          {contentType === "polaroids" && <section className="form-panel">
            <div className="panel-title"><span className="panel-step">03</span><div><h2>Your little gallery</h2><p>Upload photos and give each one a memory.</p></div></div>
            <input ref={photoInput} className="hidden-file" type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} />
            <button type="button" className="upload-drop" onClick={() => photoInput.current?.click()}><ImagePlus size={24}/><b>Choose photos from your device</b><span>JPG, PNG, WEBP · multiple photos welcome</span></button>
            <div className="memory-editor-list">{memories.filter(m => m.file || m.caption || m.message).map((m, i) => <div className="memory-editor" key={m.id}>
              <div className="memory-editor-photo">{m.preview ? <img src={m.preview} alt={m.caption || "Memory preview"} style={{filter: FILTERS.find(f => f.id === m.filter)?.css || "none"}}/> : <span>♡</span>}</div>
              <div className="memory-editor-fields"><b>Memory {i+1}</b><input value={m.caption} onChange={e => updateMemory(m.id, {caption:e.target.value})} placeholder="Caption for this memory"/><input value={m.message} onChange={e => updateMemory(m.id, {message:e.target.value})} placeholder="A message to keep under this photo"/><div className="filter-options">{FILTERS.map(f => <button type="button" key={f.id} className={m.filter === f.id ? "filter-chip selected" : "filter-chip"} onClick={() => updateMemory(m.id, {filter:f.id})}>{f.label}</button>)}</div></div>
              <button type="button" className="remove-memory" onClick={() => updateMemory(m.id, {file:null,preview:"",caption:"",message:""})} aria-label="Clear memory"><X size={16}/></button>
            </div>)}</div>
            <label className="full-label">A note to go with the gallery<textarea rows="4" value={cardMessage} onChange={e => setCardMessage(e.target.value)} placeholder="The little moments with you are my favourite..."/></label>
          </section>}

          {contentType === "cards" && <section className="form-panel">
            <div className="panel-title"><span className="panel-step">03</span><div><h2>Design your greeting card</h2><p>A few words can mean the whole world.</p></div></div>
            <label className="full-label">Inside the card<textarea rows="7" value={cardMessage} onChange={e => setCardMessage(e.target.value)} placeholder="Wishing you all the love, laughter, and magic you deserve..."/></label>
            <input ref={photoInput} className="hidden-file" type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)}/>
            <button type="button" className="upload-drop compact" onClick={() => photoInput.current?.click()}><ImagePlus size={20}/><b>Add photos to your card</b></button>
          </section>}

          <section className="form-panel">
            <div className="panel-title"><span className="panel-step">04</span><div><h2>Add the little extras</h2><p>Voice, music, video, and a hidden message.</p></div></div>
            <div className="extra-upload-grid">
              <div className="extra-upload"><div className="extra-icon"><Mic/></div><div><b>Voice message</b><p>{voiceFile ? voiceFile.name : "Record a note or upload audio."}</p></div><input ref={voiceInput} className="hidden-file" type="file" accept="audio/*" onChange={e => setVoiceFile(e.target.files?.[0] || null)}/><button type="button" className="small-outline" onClick={() => voiceInput.current?.click()}>Upload audio</button><button type="button" className="small-outline" disabled={recording} onClick={beginRecording}>{recording ? "Recording…" : "Record"}</button>{recording && <button type="button" className="small-outline stop-recording" onClick={stopRecording}>Stop</button>}</div>
              <div className="extra-upload"><div className="extra-icon"><Music2/></div><div><b>Background music</b><p>{musicFile ? musicFile.name : "Add a song or instrumental."}</p></div><input ref={musicInput} className="hidden-file" type="file" accept="audio/*" onChange={e => setMusicFile(e.target.files?.[0] || null)}/><button type="button" className="small-outline" onClick={() => musicInput.current?.click()}>Choose audio</button></div>
              <div className="extra-upload"><div className="extra-icon"><Sparkles/></div><div><b>Surprise video</b><p>{videoFile ? videoFile.name : "Add a favourite video clip."}</p></div><input ref={videoInput} className="hidden-file" type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)}/><button type="button" className="small-outline" onClick={() => videoInput.current?.click()}>Choose video</button></div>
            </div>
            <label className="full-label">Secret message<textarea rows="3" value={secret} onChange={e => setSecret(e.target.value)} placeholder="One more thing I want you to know..."/></label>
            <label className="password-toggle"><input type="checkbox" checked={protectGift} onChange={e => setProtectGift(e.target.checked)}/><span><LockKeyhole size={17}/><b>Protect this gift with a password</b></span></label>
            {protectGift && <label className="full-label">Gift password<input value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a word only they know" required/></label>}
          </section>
          <div className="builder-submit"><div><b>Your gift, your rules.</b><span>{canSaveLive ? "Supabase connected — gifts can be saved online." : "Preview mode — connect Supabase to publish permanent gifts."}</span></div><button className="btn-primary" type="submit" disabled={busy}>{busy ? "Saving your gift…" : "Create my gift"} <Gift size={17}/></button></div>
          {!canSaveLive && <p className="setup-warning">Your project is not connected to Supabase yet. You can preview the builder, but a permanent link for everyone requires the Supabase setup in README.md.</p>}
        </form>

        <aside className="live-preview">
          <div className="preview-top"><span>LIVE PREVIEW</span><span className="preview-dot"/> <span>YOUR GIFT</span></div>
          <div className="preview-envelope"><div className="preview-stamp">♡</div><span>{selectedCategory.icon}</span><h3>{title || `${selectedCategory.label} wishes`}</h3><p>made with love for</p><strong>{recipient || "your favourite person"}</strong></div>
          <div className="preview-details"><span>FROM</span><b>{sender || "Someone who cares"}</b><span>OCCASION</span><b>{selectedCategory.label}</b><span>INCLUDES</span><b>{TYPES.find(t => t.id === contentType)?.label}</b></div>
          <div className="preview-note"><Heart size={15}/><p>It's not about making something perfect. It's about making something that feels like you.</p></div>
          <div className="preview-bottom">A LITTLE THING, MADE WITH LOVE ♡</div>
        </aside>
      </div>
    </main>
  );
}

function CreatedGift({ url, copyLink, resetHome, canSaveLive }) {
  return <main className="created-page"><div className="created-card"><div className="created-icon"><Gift size={36}/></div><span className="eyebrow">YOUR LITTLE GIFT IS READY</span><h1>Something lovely,<br/><span>made for someone.</span></h1><p>{canSaveLive ? "Your gift is saved online. Share this link with your favourite person." : "This is a preview link for this browser session. Connect Supabase to make a permanent gift link that works for everyone."}</p><div className="link-box"><span>{url}</span><button onClick={copyLink}><Copy size={16}/> Copy</button></div><button className="btn-primary wide" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Preview gift <ArrowRight size={17}/></button><button className="text-link centered" onClick={resetHome}>Back to Made For You</button></div></main>;
}

function RecipientGift({ gift, unlocked, unlockInput, setUnlockInput, unlockGift, showLetter, setShowLetter, currentMemory, filterMemory, setFilterMemory, showSecret, setShowSecret, musicPlaying, setMusicPlaying, audioRef, resetHome }) {
  const [opened, setOpened] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const audioEl = useRef(null);

  useEffect(() => {
    if (gift?.music_url && audioEl.current) {
      audioEl.current.src = gift.music_url;
      audioEl.current.loop = true;
    }
  }, [gift]);

  if (!gift) return <main className="recipient-page"><div className="recipient-card"><div className="gift-emoji">💌</div><h1>Finding your little gift…</h1><p>Just a moment.</p></div></main>;
  if (gift.unavailable) return <main className="recipient-page"><div className="recipient-card"><div className="gift-emoji">♡</div><h1>{gift.title}</h1><p>Connect the project to Supabase and make sure this gift link is correct.</p><button className="btn-primary" onClick={resetHome}>Visit Made For You</button></div></main>;

  const localPreview = gift.local_preview;
  const memories = gift.memories || [];
  const category = CATEGORIES.find(c => c.id === gift.category)?.label || "A little gift";

  if (!unlocked && gift.password_hash) return <main className="recipient-page"><div className="recipient-card password-recipient"><div className="gift-emoji">🔐</div><span className="eyebrow">A LITTLE SECRET, JUST FOR YOU</span><h1>This gift is <span>just between us.</span></h1><p>Someone made something special for you. Enter the secret password to open it.</p><form onSubmit={unlockGift}><input value={unlockInput} onChange={e => setUnlockInput(e.target.value)} placeholder="Your secret password" autoComplete="off"/><button className="btn-primary wide" type="submit">Unlock my gift <LockKeyhole size={17}/></button></form></div></main>;

  if (!opened) return <main className="recipient-page"><div className="recipient-card gift-opening"><div className="opening-sparkles">✦　✧　♡</div><button className="gift-box-button" onClick={() => { setOpened(true); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000); }}><span>🎁</span><small>TAP TO OPEN</small></button><span className="eyebrow">{gift.sender_name || "SOMEONE SPECIAL"} MADE THIS FOR YOU</span><h1>A little gift,<br/><span>made with love.</span></h1><p>There are words, memories, and feelings waiting inside.</p>{showConfetti && <div className="recipient-confetti">✦ ✧ ♡ ✿ ✦ ♡ ✧</div>}</div></main>;

  return <main className="recipient-page gift-reveal">
    <div className="recipient-cover"><span className="eyebrow">{category.toUpperCase()} · A GIFT FROM THE HEART</span><h1>{gift.title || `${category} wishes`}<br/><span>for {gift.recipient_name}</span></h1><p>Made with love by {gift.sender_name || "someone who cares"}.</p>{gift.event_date && <span className="date-pill">{showDate(gift.event_date)}</span>}<div className="cover-heart">♡</div></div>
    <div className="recipient-content">
      {gift.card_message && <section className="recipient-letter"><span className="eyebrow">A LITTLE NOTE</span><p>{gift.card_message}</p></section>}
      {gift.letter && <section className="recipient-letter"><span className="eyebrow">WORDS FROM THE HEART</span><h2>A letter for you.</h2><p className="letter-body">{gift.letter}</p><button className="text-link" onClick={() => setShowLetter(v => !v)}>{showLetter ? "Fold the letter ↑" : "Read it slowly ♡"}</button>{showLetter && <p className="letter-body">Keep this close whenever you need a reminder of how loved you are. ♡</p>}</section>}
      {memories.length > 0 && <section className="recipient-memories"><div className="recipient-section-title"><span className="eyebrow">A FEW MOMENTS TO KEEP</span><h2>Our little collection.</h2></div><div className="recipient-photo-grid">{memories.map((m, i) => <article className="recipient-photo" key={i}>{m.image_url && <img src={m.image_url} alt={m.caption || "A shared memory"} style={{filter: FILTERS.find(f => f.id === m.filter)?.css || "none"}}/>}<div className="recipient-photo-caption"><b>{m.caption || "A memory to keep"}</b>{m.message && <p>{m.message}</p>}</div></article>)}</div></section>}
      {gift.voice_url && <section className="recipient-audio"><div className="audio-icon"><AudioLines/></div><div><h3>A voice note, just for you</h3><p>Sometimes hearing the words makes them mean even more.</p></div><audio src={gift.voice_url} controls preload="metadata"/></section>}
      {gift.music_url && <section className="recipient-audio"><div className="audio-icon"><Music2/></div><div><h3>Your little soundtrack</h3><p>A song to go with this moment.</p></div><audio src={gift.music_url} controls loop preload="metadata"/></section>}
      {gift.video_url && <section className="recipient-video"><span className="eyebrow">A MEMORY IN MOTION</span><h2>A little movie for you.</h2><video src={gift.video_url} controls playsInline/></section>}
      {gift.secret_message && <section className="secret-reveal"><div className="secret-envelope">♡</div><span className="eyebrow">ONE LAST THING</span><h2>There's something else.</h2>{showSecret ? <p>{gift.secret_message}</p> : <button className="btn-primary" onClick={() => setShowSecret(true)}>Open your secret message <Heart size={16}/></button>}</section>}
      <section className="final-love"><span>♡</span><h2>Some things are too lovely<br/>to leave unsaid.</h2><p>Keep this little gift close. It's yours.</p><button className="text-link" onClick={resetHome}>Made with love at Made For You ↗</button></section>
    </div>
    <audio ref={audioEl} />
  </main>;
}
