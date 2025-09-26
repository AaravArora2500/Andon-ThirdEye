import React, { useState } from 'react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CommonFilter.css';

const lineOptions = [
  { value: 'a', label: 'a' },
  { value: 'b', label: 'b' },
  { value: 'Line 3', label: 'Line 3' },
];
const machineOptions = [
  { value: 'x', label: 'x' },
  { value: 'y', label: 'y' },
  { value: 'Machine C', label: 'Machine C' },
];
const shiftOptions = [
  { value: 's1', label: 's1' },
  { value: 's2', label: 's2' },
  { value: 'Shift 3', label: 'Shift 3' },
];

export default function CommonFilter({ open, onClose, onSubmit, multiDate = false }) {
  const [line, setLine] = useState(null);
  const [machine, setMachine] = useState(null);
  const [shift, setShift] = useState(null);
  const [date, setDate] = useState(multiDate ? [] : null);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!line || !machine || !shift || (!date || (multiDate && date.length === 0))) {
      setError('Please select all fields.');
      return;
    }
    setError('');
    onSubmit({
      line: line.value,
      machine: machine.value,
      shift: shift.value,
      date: date,
    });
  };

  return (
    <div className="filter-modal-overlay">
      <div className="filter-modal">
        <button className="filter-modal-close" onClick={onClose}>&times;</button>
        <h2 style={{marginBottom: 24}}>Filter</h2>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: 16}}>
            <label>Line</label>
            <Select
              options={lineOptions}
              value={line}
              onChange={setLine}
              placeholder="Select Line"
            />
          </div>
          <div style={{marginBottom: 16}}>
            <label>Machine</label>
            <Select
              options={machineOptions}
              value={machine}
              onChange={setMachine}
              placeholder="Select Machine"
            />
          </div>
          <div style={{marginBottom: 16}}>
            <label>Shift</label>
            <Select
              options={shiftOptions}
              value={shift}
              onChange={setShift}
              placeholder="Select Shift"
            />
          </div>
          <div style={{marginBottom: 16}}>
            <label>Date{multiDate ? 's' : ''}</label>
            <DatePicker
              selected={multiDate ? null : date}
              onChange={multiDate ? (dates => setDate(dates)) : (d => setDate(d))}
              startDate={multiDate ? date[0] : undefined}
              endDate={multiDate ? date[1] : undefined}
              selectsRange={multiDate}
              selectsMultiple={multiDate}
              inline={false}
              placeholderText={multiDate ? 'Select Dates' : 'Select Date'}
              isClearable
              {...(multiDate ? { multiple: true } : {})}
            />
          </div>
          {error && <div style={{color: 'red', marginBottom: 12}}>{error}</div>}
          <button type="submit" style={{width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600}}>Apply Filter</button>
        </form>
      </div>
    </div>
  );
} 