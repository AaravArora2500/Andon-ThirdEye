import React, { useState, useEffect } from 'react';
import CommonFilter from '../components/commonfilter/CommonFilter';

const getStatusColor = (active) => {
    return active ? 'bg-green-500' : 'bg-red-500';
};

const getProductionColor = (production, target) => {
    if (target === 0) return 'bg-gray-500';
    const percentage = (production / target) * 100;
    if (percentage < 50 || percentage > 100) return 'bg-red-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
};

const MachineCard = ({ machine }) => {
    let totalDowntime = machine?.downtime?.length || 0;
    let taggedDowntime = machine?.downtime?.length ? machine?.downtime?.filter(dwn=>dwn?.tag_id ? true : false) : []
    return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col border border-gray-100 transform hover:-translate-y-1">
        <div className="p-5 flex-grow">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Machine: {machine?.data?.machine_id.toUpperCase()}</h3>
                <span className={`w-3.5 h-3.5 rounded-full ${getStatusColor(machine?.data?.active)}`}></span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Line: {machine?.data?.line_id.toUpperCase()}</p>
            
            <div className="space-y-1 text-sm">
                <p><span className="font-medium text-gray-500">PartCode:</span> <span className="font-semibold text-gray-700">{machine?.data?.variant}</span></p>
                <p><span className="font-medium text-gray-500">Shift:</span> <span className="font-semibold text-gray-700">{machine?.data?.shift_code}</span></p>
            </div>
        </div>
        <div className="px-5 pb-5">
            <div className="flex justify-between items-end mb-2">
                <p className="font-medium text-gray-500 text-sm">Production</p>
                <div className="flex items-end space-x-2">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 font-medium tracking-wider">COUNT</p>
                        <p className="font-bold text-gray-800 text-xl">{machine?.data?.production_quantity}</p>
                    </div>
                    <span className="text-gray-300 font-light text-2xl pb-1">/</span>
                    <div className="text-center">
                        <p className="text-xs text-gray-400 font-medium tracking-wider">TARGET</p>
                        <p className="font-bold text-gray-800 text-xl">{machine?.data?.target_quantity}</p>
                    </div>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`${getProductionColor(machine?.data?.production_quantity, machine?.data?.target_quantity)} h-2.5 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${machine?.data?.target_quantity > 0 ? Math.min((machine?.data?.production_quantity / machine?.data?.target_quantity) * 100, 100) : 0}%` }}
                ></div>
            </div>
        </div>
        <div className="px-5 pb-5">
            <div className="flex justify-between items-end mb-2">
                <p className="font-medium text-gray-500 text-sm">Downtime</p>
                <div className="flex items-end space-x-2">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 font-medium tracking-wider">Tagged</p>
                        <p className="font-bold text-gray-800 text-xl">{taggedDowntime?.length || 0}</p>
                    </div>
                    <span className="text-gray-300 font-light text-2xl pb-1">/</span>
                    <div className="text-center">
                        <p className="text-xs text-gray-400 font-medium tracking-wider">Total</p>
                        <p className="font-bold text-gray-800 text-xl">{totalDowntime}</p>
                    </div>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`${getProductionColor(taggedDowntime?.length || 0, totalDowntime)} h-2.5 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${taggedDowntime?.length > 0 ? Math.min((taggedDowntime?.length / totalDowntime) * 100, 100) : 0}%` }}
                ></div>
            </div>
        </div>
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Last Update: {new Date(machine?.data?.created_on).toLocaleString()}</p>
        </div>
    </div>
);}


const Andon = () => {
    const [machineData, setMachineData] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterData, setFilterData] = useState(null);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, []);

    useEffect(() => {
        const eventSource = new EventSource(`${'http://localhost:4000'}/events/shift_summary`);

        eventSource.onmessage = (event) => {
            const newData = JSON.parse(event?.data);
            console.log(newData);
            setMachineData(prevData => {
                const updatedData = { ...prevData };
                const line = newData?.data?.line_id;
                if (!updatedData[line]) {
                    updatedData[line] = [];
                }
                const machineIndex = updatedData[line].findIndex(m => m?.data?.machine_id === newData?.data?.machine_id && m?.data?.line_id === newData?.data?.line_id);
                if (machineIndex > -1) {
                    updatedData[line][machineIndex] = newData;
                } else {
                    updatedData[line].push(newData);
                }
                return updatedData;
            });
        };

        eventSource.onerror = (err) => {
            console.error('SSE error:', err);
        };

        return () => {
            eventSource.close();
        };
    }, []);
    console.log(machineData)
    const allMachines = Object.keys(machineData)
        .sort()
        .flatMap(lineId => machineData[lineId].sort((a, b) => a?.data?.machine_id.localeCompare(b?.data?.machine_id)));
    console.log(allMachines)
    const CARDS_PER_PAGE = 6;
    const totalPages = Math.ceil(allMachines.length / CARDS_PER_PAGE);

    useEffect(() => {
        if (totalPages > 1) {
            const timer = setTimeout(() => {
                setCurrentPage((prevPage) => (prevPage + 1) % totalPages);
            }, 10000); // 10 seconds
            return () => clearTimeout(timer);
        }
    }, [currentPage, totalPages]);

    const handleFilterSubmit = (data) => {
        setFilterData(data);
        setFilterOpen(false);
        // You can add logic here to fetch filtered data
        console.log('Filter submitted:', data);
    };

    if (allMachines.length === 0) {
        return (
            <div className="p-4 bg-white min-h-screen text-gray-600 flex justify-center items-center">
                <h1 className="text-3xl font-bold text-gray-800 animate-pulse">Waiting for machine data...</h1>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white min-h-screen text-gray-800 flex flex-col overflow-hidden relative">
            <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-6 tracking-tight">Andon Screen</h1>
            <button 
                title='Fullscreen'
                onClick={toggleFullScreen} 
                className="absolute top-4 right-4 p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-300 z-50"
                aria-label="Toggle Fullscreen"
            >
                {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m0 0l5-5m11 5h-4m0 0v-4m0 4l-5-5" />
                    </svg>
                )}
            </button>
            <button onClick={() => setFilterOpen(true)} style={{marginBottom: 16}}>Open Filter</button>
            {filterOpen && (
                <CommonFilter
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    onSubmit={handleFilterSubmit}
                />
            )}
            <div className="flex-grow flex flex-col justify-center relative">
                <div className="w-full max-w-7xl mx-auto">
                    <div
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(-${currentPage * 100}%)` }}
                    >
                        {Array.from({ length: totalPages }).map((_, pageIndex) => {
                            const pageMachines = allMachines.slice(pageIndex * CARDS_PER_PAGE, (pageIndex + 1) * CARDS_PER_PAGE);
                            return (
                                <div key={pageIndex} className="w-full flex-shrink-0 px-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {pageMachines.map(machine => (
                                            <MachineCard key={`${machine?.data?.line_id}-${machine?.data?.machine_id}`} machine={machine} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 pb-4">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentPage(idx)}
                            className={`w-3 h-3 mx-2 rounded-full transition-colors duration-300 ${currentPage === idx ? 'bg-gray-800' : 'bg-gray-300 hover:bg-gray-400'}`}
                            aria-label={`Go to page ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Andon;