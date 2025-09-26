import React, { useEffect, useState } from 'react'
import CommonFilter from '../components/commonfilter/CommonFilter'
import { formatDateString } from '../utils/DateUtils/FormatDate'

export default function DowntimeTagging(props) {
    let API = 'http://localhost:4000'
    const [downtimeReasons, setDowntimeReasons] = useState([])
    const [dedectedDowntime, setDectedDowntime] = useState([])
    const [filterOpen, setFilterOpen] = useState(false)
    const [selectedDowntime, setSelectedDowntime] = useState(null)
    const [tagModalOpen, setTagModalOpen] = useState(false)
    const [tagStep, setTagStep] = useState(1)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [selectedSubCategory, setSelectedSubCategory] = useState(null)
    const [selectedReason, setSelectedReason] = useState(null)
    const [lastFilterData, setLastFilterData] = useState(null)
    const [viewModalOpen, setViewModalOpen] = useState(false)
    const [viewDowntime, setViewDowntime] = useState(null)
    const [filterApplied, setFilterApplied] = useState(false)

    useEffect(() => {
        fetch(`${API}/api/downtime/reasons`)
            .then(res => res.json())
            .then(data => {
                setDowntimeReasons(data)
            }).catch(error => {
                console.log(error);
            })
        
    }, [])

    const handleFilterSubmit = async(data) => {
        try {
          setFilterOpen(false)
          setFilterApplied(true)
          console.log(data);

          let {date, line:line_id, machine:machine_id, shift:shift_code} = data;
          let params = {
              date: formatDateString(date) || date.toISOString().split('T')[0],
              line_id,
              machine_id,
              shift_code
          }
          console.log(params);
          const queryString = new URLSearchParams(params).toString();
          let response = await fetch(`${API}/api/downtime?${queryString}`)
          let responseData = await response.json()
          console.log(responseData);
          setDectedDowntime(responseData)
          setLastFilterData(data)
        }
        catch(error) {
            console.log(error);
        }
    }

    // Tag/Update handler
    const handleTagSubmit = async () => {
        if (!selectedDowntime || !selectedReason) return;
        try {
            const response = await fetch(`${API}/api/downtime/${selectedDowntime.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag_id: selectedReason.code })
            });
            if (!response.ok) throw new Error('Failed to tag downtime');
            setTagModalOpen(false);
            setSelectedDowntime(null);
            setSelectedCategory(null);
            setSelectedSubCategory(null);
            setSelectedReason(null);
            setTagStep(1);
            // Refresh downtime list
            // Reuse last filter if available, else refetch with default
            // For now, just refetch with last used params if possible
            // (Assume last filter params are in a ref or state, else call handleFilterSubmit with last data)
            // For simplicity, call handleFilterSubmit with last used params if available
            // If not, just fetch today's date
            // (You may want to improve this logic for production)
            if (typeof lastFilterData !== 'undefined' && lastFilterData) {
                handleFilterSubmit(lastFilterData);
            } else {
                // fallback: fetch today
                const today = new Date();
                handleFilterSubmit({ date: today, line: '', machine: '', shift: '' });
            }
        } catch (error) {
            alert(error.message || 'Error tagging downtime');
        }
    }

    // Untag/Delete handler
    const handleUntag = async (dt) => {
        if (!dt) return;
        if (!window.confirm('Are you sure you want to untag this downtime?')) return;
        try {
            const response = await fetch(`${API}/api/downtime/${dt.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag_id: '' })
            });
            if (!response.ok) throw new Error('Failed to untag downtime');
            // Refresh downtime list
            if (typeof lastFilterData !== 'undefined' && lastFilterData) {
                handleFilterSubmit(lastFilterData);
            } else {
                const today = new Date();
                handleFilterSubmit({ date: today, line: '', machine: '', shift: '' });
            }
        } catch (error) {
            alert(error.message || 'Error untagging downtime');
        }
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Downtime Tagging</h1>
                <button
                    onClick={() => setFilterOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                >
                    Open Filter
                </button>
            </div>
            {/* Filter Modal */}
            {filterOpen && (
                <CommonFilter
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    onSubmit={handleFilterSubmit}
                />
            )}
            {/* Downtime Table */}
            {!filterApplied ? (
                <div className="flex items-center justify-center h-full animate-pulse text-gray-400 text-lg">
                    <h1 className='text-4xl'>Select filter</h1>
                </div>
                ) : dedectedDowntime.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-lg">
                        <h1 className='text-4xl'>No data found for filters.</h1>
                    </div>
                ) :(
                <div className="bg-white rounded-2xl shadow-xl p-6 overflow-x-auto">
                    <h2 className="text-xl font-bold mb-6 text-gray-800">Detected Downtime</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-separate border-spacing-y-1">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-100 text-gray-700">
                                    <th className="px-4 py-2 text-left rounded-tl-xl">ID</th>
                                    <th className="px-4 py-2 text-left">Plant</th>
                                    <th className="px-4 py-2 text-left">Line</th>
                                    <th className="px-4 py-2 text-left">Machine</th>
                                    <th className="px-4 py-2 text-left">Shift</th>
                                    <th className="px-4 py-2 text-left">Start</th>
                                    <th className="px-4 py-2 text-left">End</th>
                                    <th className="px-4 py-2 text-left">Tag</th>
                                    <th className="px-4 py-2 text-left rounded-tr-xl">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dedectedDowntime.map((dt, idx) => (
                                    <tr key={dt.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 group rounded-xl shadow-sm`}>
                                        <td className="px-4 py-2 font-mono">{dt.id}</td>
                                        <td className="px-4 py-2">{dt.plant_id}</td>
                                        <td className="px-4 py-2">{dt.line_id}</td>
                                        <td className="px-4 py-2">{dt.machine_id}</td>
                                        <td className="px-4 py-2">{dt.shift_code}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{dt.start_time}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{dt.end_time}</td>
                                        <td className="px-4 py-2">{dt.tag_id || <span className="text-gray-400">-</span>}</td>
                                        <td className="px-4 py-2 space-x-2 flex items-center">
                                            <button title="View details" className="p-2 rounded-full hover:bg-blue-100 transition" onClick={() => { setViewDowntime(dt); setViewModalOpen(true); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            {dt.tag_id ? (
                                                <>
                                                    <button title="Edit tag" className="p-2 rounded-full hover:bg-yellow-100 transition" onClick={() => { setSelectedDowntime(dt); setTagModalOpen(true); setTagStep(1); }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4 1a1 1 0 01-1.263-1.263l1-4a4 4 0 01.828-1.414z" /></svg>
                                                    </button>
                                                    <button title="Delete tag" className="p-2 rounded-full hover:bg-red-100 transition" onClick={() => handleUntag(dt)}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <button title="Tag downtime" className="p-2 rounded-full hover:bg-blue-200 transition" onClick={() => { setSelectedDowntime(dt); setTagModalOpen(true); setTagStep(1); }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Tag/Edit Modal */}
            {tagModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-modalIn">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition" onClick={() => setTagModalOpen(false)} aria-label="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className="text-2xl font-bold mb-6 text-gray-800">{selectedDowntime?.tag_id ? 'Edit Downtime Tag' : 'Tag Downtime'}</h3>
                        {/* Step 1: Category */}
                        {tagStep === 1 && (
                            <div>
                                <div className="mb-2 font-semibold text-gray-700">Select Category:</div>
                                <div className="flex flex-wrap gap-2">
                                    {[...new Set(downtimeReasons.map(r => r.category))].map(category => (
                                        <button
                                            key={category}
                                            className={`px-4 py-2 rounded-lg shadow-sm transition font-medium ${selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-blue-100 text-gray-700'}`}
                                            onClick={() => { setSelectedCategory(category); setTagStep(2); setSelectedSubCategory(null); setSelectedReason(null); }}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Step 2: Subcategory */}
                        {tagStep === 2 && (
                            <div>
                                <div className="mb-2 font-semibold text-gray-700">Select Subcategory:</div>
                                <div className="flex flex-wrap gap-2">
                                    {[...new Set(downtimeReasons.filter(r => r.category === selectedCategory).map(r => r.sub_category))].map(sub => (
                                        <button
                                            key={sub}
                                            className={`px-4 py-2 rounded-lg shadow-sm transition font-medium ${selectedSubCategory === sub ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-blue-100 text-gray-700'}`}
                                            onClick={() => { setSelectedSubCategory(sub); setTagStep(3); setSelectedReason(null); }}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                                <button className="mt-6 text-blue-600 hover:underline font-medium" onClick={() => setTagStep(1)}>Back</button>
                            </div>
                        )}
                        {/* Step 3: Reason */}
                        {tagStep === 3 && (
                            <div>
                                <div className="mb-2 font-semibold text-gray-700">Select Downtime Reason:</div>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                    {downtimeReasons.filter(r => r.category === selectedCategory && r.sub_category === selectedSubCategory).map(reason => (
                                        <button
                                            key={reason.code}
                                            className={`px-4 py-2 rounded-lg shadow-sm transition font-medium ${selectedReason?.code === reason.code ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-blue-100 text-gray-700'}`}
                                            onClick={() => setSelectedReason(reason)}
                                        >
                                            {reason.description}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-6">
                                    <button className="text-blue-600 hover:underline font-medium" onClick={() => setTagStep(2)}>Back</button>
                                    <button className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow disabled:opacity-50 font-semibold transition" disabled={!selectedReason} onClick={handleTagSubmit}>Submit</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* View Modal */}
            {viewModalOpen && viewDowntime && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-modalIn">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition" onClick={() => setViewModalOpen(false)} aria-label="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className='text-2xl font-semibold mb-6 text-gray-800'>Tag Detail</h3>
                        {viewDowntime.tag_id && (() => {
                            const reason = downtimeReasons.find(r => r.code === viewDowntime.tag_id);
                            if (!reason) return <div className="mt-4 text-red-500">Tag info not found.</div>;
                            return (
                                <div className="mt-4 p-4 bg-gray-50 rounded-xl border space-y-2">
                                    <div><span className="font-semibold text-gray-700">Category:</span> {reason.category}</div>
                                    <div><span className="font-semibold text-gray-700">Subcategory:</span> {reason.sub_category}</div>
                                    <div><span className="font-semibold text-gray-700">Department:</span> {reason.department}</div>
                                    <div><span className="font-semibold text-gray-700">Description:</span> {reason.description}</div>
                                    <div><span className="font-semibold text-gray-700">Process Type:</span> {reason.process_type}</div>
                                    <div><span className="font-semibold text-gray-700">Target Duration:</span> {reason.target_duration}</div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}