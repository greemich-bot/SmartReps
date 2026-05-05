import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MaxLog.css';

const API = 'http://localhost:5001/api/max-lifts';

const todayIso = () => new Date().toISOString().slice(0, 10);

function LiftChart({ title, entries, keyName }) {
	const points = entries
		.filter((e) => e[keyName] != null)
		.map((e) => ({ date: e.date, value: Number(e[keyName]) }));

	if (points.length < 2) {
		return (
			<div className="lift-chart-card">
				<h4>{title}</h4>
				<p className="lift-chart-empty">Add at least two logs to see a trend line.</p>
			</div>
		);
	}

	const w = 260;
	const h = 110;
	const pad = 12;
	const min = Math.min(...points.map((p) => p.value));
	const max = Math.max(...points.map((p) => p.value));
	const range = max - min || 1;
	const poly = points.map((p, i) => {
		const x = pad + (i / (points.length - 1)) * (w - pad * 2);
		const y = pad + (1 - (p.value - min) / range) * (h - pad * 2);
		return `${x},${y}`;
	}).join(' ');

	return (
		<div className="lift-chart-card">
			<h4>{title}</h4>
			<svg viewBox={`0 0 ${w} ${h}`} className="lift-chart-svg" aria-label={`${title} progress chart`}>
				<polyline points={poly} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			<div className="lift-chart-meta">
				<span>{new Date(points[0].date).toLocaleDateString()}</span>
				<strong>{points[points.length - 1].value.toLocaleString()} lbs</strong>
				<span>{new Date(points[points.length - 1].date).toLocaleDateString()}</span>
			</div>
		</div>
	);
}

function MaxLog() {
	const [form, setForm] = useState({ date: todayIso(), squat: '', deadlift: '', benchpress: '' });
	const [entries, setEntries] = useState([]);
	const [saving, setSaving] = useState(false);
	const [reverting, setReverting] = useState(false);
	const [status, setStatus] = useState('');

	const fetchLogs = () => {
		axios.get(API)
			.then((res) => {
				const list = res.data?.entries || [];
				setEntries(list);
			})
			.catch(() => {});
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	const updateField = (key, value) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		setStatus('');
	};

	const save = async (e) => {
		e.preventDefault();
		setSaving(true);
		setStatus('');
		try {
			const payload = {
				date: form.date,
				squat: form.squat === '' ? null : Number(form.squat),
				deadlift: form.deadlift === '' ? null : Number(form.deadlift),
				benchpress: form.benchpress === '' ? null : Number(form.benchpress)
			};
			await axios.put(API, payload);
			setForm((prev) => ({ ...prev, squat: '', deadlift: '', benchpress: '' }));
			fetchLogs();
			setStatus('Saved');
		} catch {
			setStatus('Unable to save right now');
		}
		setSaving(false);
	};

	const revertLast = async () => {
		setReverting(true);
		setStatus('');
		try {
			await axios.delete(`${API}/latest`);
			fetchLogs();
			setStatus('Last entry removed');
		} catch {
			setStatus('Unable to revert right now');
		}
		setReverting(false);
	};

	return (
		<section className="maxlog-card">
			<div className="maxlog-header">
				<h3>Strength Max Log</h3>
				<p>Log your best lifts in lbs so you can track progress over time.</p>
			</div>

			<form className="maxlog-form" onSubmit={save}>
				<label className="maxlog-field">
					<span>Date</span>
					<input
						type="date"
						value={form.date}
						onChange={(e) => updateField('date', e.target.value)}
					/>
				</label>

				<label className="maxlog-field">
					<span>Squat (lbs)</span>
					<input
						type="number"
						min="0"
						step="0.1"
						value={form.squat}
						onChange={(e) => updateField('squat', e.target.value)}
						placeholder="e.g. 315"
					/>
				</label>

				<label className="maxlog-field">
					<span>Deadlift (lbs)</span>
					<input
						type="number"
						min="0"
						step="0.1"
						value={form.deadlift}
						onChange={(e) => updateField('deadlift', e.target.value)}
						placeholder="e.g. 405"
					/>
				</label>

				<label className="maxlog-field">
					<span>Bench Press (lbs)</span>
					<input
						type="number"
						min="0"
						step="0.1"
						value={form.benchpress}
						onChange={(e) => updateField('benchpress', e.target.value)}
						placeholder="e.g. 225"
					/>
				</label>

				<div className="maxlog-actions">
					<button type="submit" className="maxlog-save-btn" disabled={saving}>
						{saving ? 'Saving...' : 'Save Maxes'}
					</button>
					<button
						type="button"
						className="maxlog-revert-btn"
						onClick={revertLast}
						disabled={reverting || entries.length === 0}
					>
						{reverting ? 'Reverting...' : 'Revert Last Entry'}
					</button>
					{status && <span className="maxlog-status">{status}</span>}
				</div>
			</form>

			<div className="lift-charts-grid">
				<LiftChart title="Squat Progress" entries={entries} keyName="squat" />
				<LiftChart title="Deadlift Progress" entries={entries} keyName="deadlift" />
				<LiftChart title="Bench Press Progress" entries={entries} keyName="benchpress" />
			</div>
		</section>
	);
}

export default MaxLog;
