import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion, AnimatePresence } from "framer-motion";
import './App.css';
import config from './config.json'; 

const API_KEY = config.gemini_key || "YOUR_KEY_HERE";
const genAI = new GoogleGenerativeAI(API_KEY);

function App() {
  const [showManual, setShowManual] = useState(false);
  const [length, setLength] = useState(250); 
  const [gravity, setGravity] = useState(9.81);
  const [mass, setMass] = useState(50); 
  const [planetName, setPlanetName] = useState("Earth");
  const [angle, setAngle] = useState(0);
  const [time, setTime] = useState(0);
  const [graphData, setGraphData] = useState([]);
  const [activeTab, setActiveTab] = useState('manual');
  const [records, setRecords] = useState([]);
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const lastAngle = useRef(0);
  const realLength = (length / 100).toFixed(2);
  const timePeriod = (2 * Math.PI * Math.sqrt(realLength / gravity)).toFixed(2);

  // Theoretical Model Graph Data: Period (T) vs Length (L)
  const theoryModelData = useMemo(() => {
    const data = [];
    // Generating points from 1.0m to 5.0m for the manual's reference graph
    for (let l = 1.0; l <= 5.0; l += 0.5) {
      const t = 2 * Math.PI * Math.sqrt(l / gravity);
      data.push({ 
        l: l.toFixed(1), 
        t: parseFloat(t.toFixed(2)) 
      });
    }
    return data;
  }, [gravity]);

  const planets = [
    { name: "Moon", g: 1.62 },
    { name: "Earth", g: 9.81 },
    { name: "Jupiter", g: 24.79 }
  ];

  const staticStars = useMemo(() => Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 3 + 2
  })), []);

  const dustParticles = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 10,
    size: Math.random() * 2 + 1
  })), []);

  const askGemini = async () => {
    setLoading(true);
    setAiResponse("Gemini is analyzing...");
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", 
        systemInstruction: "You are a specialized Aerospace Physics Assistant. Respond in helpful Tanglish."
      });

      const prompt = `Lab Data: Planet ${planetName}, Gravity ${gravity} m/s², Mass ${mass}g, Length ${realLength}m. 
      Briefly explain the physics results in Tanglish.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiResponse(response.text());
    } catch (error) {
      console.error("Gemini Error:", error);
      setAiResponse("Error: Gemini connection fail aagiduchi. Key check pannanum.");
    }
    setLoading(false);
  };

  const recordObservation = () => {
    const newRecord = { 
        id: Date.now(), 
        location: planetName, 
        l: realLength, 
        g: gravity, 
        m: mass, 
        t: timePeriod,
        tSq: (parseFloat(timePeriod) ** 2).toFixed(2)
    };
    setRecords([newRecord, ...records]);
  };

  const deleteRecord = (id) => setRecords(records.filter(r => r.id !== id));

  const exportToCSV = () => {
    if (records.length === 0) {
      alert("First konjam data record pannunga!");
      return;
    }
    const headers = "Planet,Length (m),Mass (g),Gravity (m/s2),Period (s),T2 (s2)\n";
    const rows = records.map(r => `${r.location},${r.l},${r.m},${r.g},${r.t},${r.tSq}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Lab_Data_${planetName}.csv`;
    link.click();
  };

  useEffect(() => {
    if (isPaused) return; 
    const interval = setInterval(() => {
      setTime((t) => t + 0.05);
      const frequency = Math.sqrt(gravity / realLength);
      const newAngle = 35 * Math.cos(frequency * time);
      lastAngle.current = newAngle;
      setAngle(newAngle);
      setGraphData((prev) => [...prev, { time: time.toFixed(1), angle: parseFloat(newAngle.toFixed(2)) }].slice(-50));
    }, 50);
    return () => clearInterval(interval);
  }, [time, gravity, realLength, isPaused]);

  return (
    <div className={`lab-container dark-mode ${planetName.toLowerCase()}`}>
      
      <div className="space-overlay">
        {staticStars.map(star => (
          <motion.div 
            key={star.id} 
            className="star" 
            style={{ position: 'absolute', top: star.top, left: star.left, width: star.size, height: star.size, backgroundColor: 'white', borderRadius: '50%' }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: star.duration, repeat: Infinity }}
          />
        ))}
        {dustParticles.map(dust => (
          <motion.div 
            key={dust.id} 
            className="lunar-dust"
            style={{ position: 'absolute', left: dust.left, width: dust.size, height: dust.size }}
            animate={{ 
              y: [-100, 1100], 
              x: [0, Math.random() * 100 - 50],
              opacity: [0, 0.6, 0] 
            }}
            transition={{ duration: 20 + Math.random() * 10, repeat: Infinity, delay: dust.delay, ease: "linear" }}
          />
        ))}
      </div>

      <header className="lab-header">
        <h1>VIRTUAL PRECISION LAB <span style={{fontSize: '0.8rem', color: '#00f2ff'}}>POWERED BY GEMINI 3 FLASH</span></h1>
      </header>

      <div className="main-lab">
        <div className="experiment-setup">
          <div className="wooden-beam"></div>
          <div className="pendulum-thread" style={{ height: `${length}px`, transform: `rotate(${angle}deg)` }}>
            <div className="thread-line"></div>
            <div className="metal-bob" style={{ 
                width: `${20 + mass/10}px`, 
                height: `${20 + mass/10}px`, 
                bottom: `-${(20 + mass/10)/2}px`, 
                left: `-${(20 + mass/10)/2}px` 
            }}></div>
          </div>
        </div>

        <div className="lab-interface">
          <div className="tab-buttons">
            {['manual', 'analytics', 'notebook', 'ai'].map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'manual' && (
              <div className="manual-view">
                <div className="blackboard">
                  <div className="formula">T = 2π √(L/g)</div>
                  <ul className="stats-list">
                      <li>Planet: <strong>{planetName}</strong></li>
                      <li>Length: {realLength} m</li>
                      <li>Time Period: {timePeriod} s</li>
                  </ul>
                  <div className="btn-group">
                    <button className="record-btn" onClick={recordObservation}>LOG OBSERVATION</button>
                    <button className="pause-btn" onClick={() => setIsPaused(!isPaused)}>{isPaused ? "RESUME" : "PAUSE"}</button>
                  </div>
                </div>
                <div className="control-panel">
                  <div className="planet-selector">
                    {planets.map(p => (
                        <button key={p.name} className={planetName === p.name ? "active-p" : ""} onClick={() => { setPlanetName(p.name); setGravity(p.g); }}>
                            {p.name}
                        </button>
                    ))}
                  </div>
                  <label>Length (L): {realLength}m</label>
                  <input type="range" min="150" max="400" value={length} onChange={(e) => setLength(Number(e.target.value))} />
                  <label>Mass (M): {mass}g</label>
                  <input type="range" min="20" max="200" value={mass} onChange={(e) => setMass(Number(e.target.value))} />
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="analytics-view">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#888" />
                    <YAxis stroke="#888" domain={[-40, 40]} />
                    <Tooltip contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #00f2ff'}} />
                    <Line type="monotone" dataKey="angle" stroke="#00f2ff" strokeWidth={3} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'notebook' && (
              <div className="notebook-container">
                <button className="csv-btn" onClick={exportToCSV}>DOWNLOAD CSV</button>
                <div className="scroll-table-wrapper">
                  <table className="observation-table">
                    <thead>
                      <tr>
                          <th>Planet</th>
                          <th>L (m)</th>
                          <th>T (s)</th>
                          <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id}>
                          <td>{r.location}</td>
                          <td>{r.l}</td>
                          <td>{r.t}</td>
                          <td><button className="del-btn" onClick={() => deleteRecord(r.id)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="ai-view">
                <button className="ai-btn" onClick={askGemini} disabled={loading}>{loading ? "Thinking..." : "Ask Gemini"}</button>
                <div className="ai-text-response">{aiResponse}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="manual-toggle" onClick={() => setShowManual(!showManual)}>
        {showManual ? "✕ CLOSE GUIDE" : "📖 LAB MANUAL"}
      </button>

      <AnimatePresence>
      {showManual && (
        <motion.div 
          className="theory-dashboard open"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", damping: 20 }}
        >
          <div className="manual-content scrollable">
            <h1 className="main-theory-title" style={{ fontSize: '1.2rem', color: '#00f2ff', marginBottom: '10px' }}>
              Acceleration due to gravity in simple pendulum
            </h1>
            <h2 className="dash-title">LABORATORY MANUAL</h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Subject: Aerospace Physics (PH101)</p>
            <hr />
            
            <section>
              <h3 className="blue-head">AIM</h3>
              <p>To determine the acceleration due to gravity (g) and investigate the relationship between the effective length of a simple pendulum and its oscillation period.</p>
            </section>

            <section>
              <h3 className="blue-head">APPARATUS</h3>
              <p>Precision bob, inextensible high-tensile string, frictionless pivot, and high-frequency digital telemetry (simulated).</p>
            </section>

            <section>
              <h3 className="blue-head">THEORY</h3>
              <p>For small amplitude oscillations, the time period <strong>T</strong> follows the formula:</p>
              <div className="math-box">
                T = 2π √(L/g)
              </div>
              <p>Where:</p>
              <ul>
                <li><strong>L:</strong> Effective length (pivot to bob center)</li>
                <li><strong>g:</strong> Acceleration due to gravity</li>
                <li><strong>T:</strong> Time for one complete cycle</li>
              </ul>

              {/* Model Graph added within the Dashboard Manual */}
              <div className="theory-model-graph" style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#00f2ff', textAlign: 'center' }}>Model: Period vs Length</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={theoryModelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="l" stroke="#888" fontSize={10} label={{ value: 'L (m)', position: 'insideBottom', offset: -2, fill: '#888', fontSize: 10 }} />
                    <YAxis stroke="#888" fontSize={10} label={{ value: 'T (s)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00f2ff', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="t" stroke="#00f2ff" strokeWidth={2} dot={false} />
                    {/* Reference point showing current experimental setup */}
                    <ReferenceLine x={realLength} stroke="rgba(255, 255, 0, 0.5)" label={{ position: 'top', value: 'Current L', fill: '#fff', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p style={{ marginTop: '10px' }}>The relationship proves that mass does not affect the period in a vacuum.</p>
            </section>

            <section>
              <h3 className="blue-head">PROCEDURE</h3>
              <ol>
                <li>Select the <strong>Planet</strong> to initialize the gravity constant.</li>
                <li>Vary the <strong>Length (L)</strong> and observe changes in oscillation speed.</li>
                <li>Use the <strong>Analytics</strong> tab to track the angular displacement wave.</li>
                <li>Log the data into the <strong>Notebook</strong> for multiple lengths.</li>
                <li>Compare the simulated $T$ with the theoretical formula.</li>
              </ol>
            </section>
            
            <section className="result-section">
              <h3 className="blue-head">EXPERIMENTAL RESULT</h3>
              <p>
                The acceleration due to gravity on <strong>{planetName}</strong> is verified as <strong>{gravity} m/s²</strong>.
              </p>
            </section>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

export default App;