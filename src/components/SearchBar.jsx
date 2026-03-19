import { motion } from "framer-motion";
import { IoSearch, IoClose } from "react-icons/io5";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { trackEvent } from "../utils/metaPixel";



export default function SearchBar({ onClose }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const navigate = useNavigate();

    // Get data from Redux store
    const events = useSelector((state) => state.events.events);
    const pilgrimRetreats = useSelector((state) => state.pilgrimRetreat.pilgrimRetreatCards);
    const pilgrimGuides = useSelector((state) => state.pilgrimGuides.guides);
    const liveSessions = useSelector((state) => state.pilgrimLiveSession.LiveSession);
    const recordedSessions = useSelector((state) => state.pilgrimRecordedSession.recordedSessions);

    // Fetch additional data from Firestore if not in Redux
    const [additionalData, setAdditionalData] = useState({
        retreats: [],
        guides: [],
        liveSessions: [],
        recordedSessions: []
    });

    // Load recent searches from localStorage on component mount
    useEffect(() => {
        const savedSearches = localStorage.getItem('urbanPilgrimRecentSearches');
        if (savedSearches) {
            try {
                const parsed = JSON.parse(savedSearches);
                setRecentSearches(parsed);
            } catch (error) {
                console.error('Error parsing recent searches:', error);
                setRecentSearches([]);
            }
        }
    }, []);

    // Save recent searches to localStorage whenever it changes
    useEffect(() => {
        if (recentSearches.length > 0) {
            localStorage.setItem('urbanPilgrimRecentSearches', JSON.stringify(recentSearches));
        }
    }, [recentSearches]);

    useEffect(() => {
        const fetchAdditionalData = async () => {
            try {
                // Fetch pilgrim retreats
                const retreatRef = doc(db, `pilgrim_retreat/user-uid/retreats/data`);
                const retreatSnapshot = await getDoc(retreatRef);
                if (retreatSnapshot.exists()) {
                    const retreatData = retreatSnapshot.data();
                    const retreatsArray = Object.keys(retreatData)
                        .sort((a, b) => Number(a) - Number(b))
                        .map((key) => ({
                            id: key,
                            ...retreatData[key],
                        }));
                    setAdditionalData(prev => ({ ...prev, retreats: retreatsArray }));
                }

                // Fetch pilgrim guides
                const guidesRef = doc(db, `pilgrim_guides/pilgrim_guides/guides/data`);
                const guidesSnapshot = await getDoc(guidesRef);
                if (guidesSnapshot.exists()) {
                    const guidesData = guidesSnapshot.data();
                    setAdditionalData(prev => ({ ...prev, guides: guidesData.slides || [] }));
                }

                // Fetch live sessions
                const liveSessionsRef = doc(db, `pilgrim_sessions/pilgrim_sessions/sessions/liveSession`);
                const liveSessionsSnapshot = await getDoc(liveSessionsRef);
                if (liveSessionsSnapshot.exists()) {
                    const liveSessionsData = liveSessionsSnapshot.data();
                    setAdditionalData(prev => ({ ...prev, liveSessions: liveSessionsData.slides || [] }));
                }

                // Fetch recorded sessions
                const recordedSessionsRef = doc(db, `pilgrim_sessions/pilgrim_sessions/sessions/recordedSession`);
                const recordedSessionsSnapshot = await getDoc(recordedSessionsRef);
                if (recordedSessionsSnapshot.exists()) {
                    const recordedSessionsData = recordedSessionsSnapshot.data();
                    setAdditionalData(prev => ({ ...prev, recordedSessions: recordedSessionsData.slides || [] }));
                }
            } catch (error) {
                console.error("Error fetching additional data:", error);
            }
        };

        fetchAdditionalData();
    }, []);

    // Combine all data sources
    const getAllSearchableData = () => {
        const allData = [];

        // Add upcoming events
        if (events && Object.keys(events).length > 0) {
            Object.entries(events).forEach(([id, eventData]) => {
                if (eventData?.upcomingSessionCard?.title) {
                    allData.push({
                        id,
                        title: eventData.upcomingSessionCard.title,
                        type: 'event',
                        category: eventData.upcomingSessionCard.category || '',
                        image: eventData.upcomingSessionCard.image || '',
                        price: eventData.upcomingSessionCard.price || '',
                        location: eventData.upcomingSessionCard.location || '',
                        link: `/event/${eventData.upcomingSessionCard.title.replace(/\s+/g, '-')}`,
                        data: eventData
                    });
                }
            });
        }

        // Add pilgrim retreats
        const retreats = pilgrimRetreats.length > 0 ? pilgrimRetreats : additionalData.retreats;
        retreats.forEach((retreat, index) => {
            if (retreat?.pilgrimRetreatCard?.title) {
                allData.push({
                    id: retreat.id || index,
                    title: retreat.pilgrimRetreatCard.title,
                    type: 'retreat',
                    category: retreat.pilgrimRetreatCard.category || '',
                    image: retreat.pilgrimRetreatCard.image || '',
                    price: retreat.pilgrimRetreatCard.price || '',
                    location: retreat.pilgrimRetreatCard.location || '',
                    link: `/pilgrim_retreats/${retreat.pilgrimRetreatCard.title.replace(/\s+/g, '-')}`,
                    data: retreat
                });
            }
        });

        // Add pilgrim guides
        const guides = pilgrimGuides.length > 0 ? pilgrimGuides : additionalData.guides;
        guides.forEach((guide, index) => {
            if (guide?.guideCard?.title) {
                allData.push({
                    id: guide.id || index,
                    title: guide.guideCard.title,
                    type: 'guide',
                    category: guide.guideCard.category || '',
                    image: guide.guideCard.thumbnail || '',
                    price: guide.guideCard.price || '',
                    link: `/guide/${guide.guideCard.title.replace(/\s+/g, '-')}`,
                    data: guide
                });
            }
        });

        // Add live sessions
        const liveSessionsData = liveSessions.length > 0 ? liveSessions : additionalData.liveSessions;
        liveSessionsData.forEach((session, index) => {
            if (session?.liveSessionCard?.title) {
                allData.push({
                    id: session.id || index,
                    title: session.liveSessionCard.title,
                    type: 'live-session',
                    category: session.liveSessionCard.category || '',
                    image: session.liveSessionCard.thumbnail || '',
                    price: session.liveSessionCard.price || '',
                    link: `/session/${session.liveSessionCard.title.replace(/\s+/g, '-')}/details`,
                    data: session
                });
            }
        });

        // Add recorded sessions
        const recordedSessionsData = recordedSessions.length > 0 ? recordedSessions : additionalData.recordedSessions;
        recordedSessionsData.forEach((session, index) => {
            if (session?.recordedProgramCard?.title) {
                allData.push({
                    id: session.id || index,
                    title: session.recordedProgramCard.title,
                    type: 'recorded-session',
                    category: session.recordedProgramCard.category || '',
                    image: session.recordedProgramCard.thumbnail || '',
                    price: session.recordedProgramCard.price || '',
                    link: `/program/${session.recordedProgramCard.title.replace(/\s+/g, '-')}/details`,
                    data: session
                });
            }
        });

        return allData;
    };

    // Search function
    const performSearch = (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const allData = getAllSearchableData();
        const normalizedQuery = query.toLowerCase().trim();

        const results = allData.filter(item => {
            const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
            const categoryMatch = item.category.toLowerCase().includes(normalizedQuery);
            const locationMatch = item.location && item.location.toLowerCase().includes(normalizedQuery);
            
            return titleMatch || categoryMatch || locationMatch;
        });

        setSearchResults(results);
        setIsSearching(false);
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        performSearch(query);
    };

    // Handle result click
    const handleResultClick = (result) => {
        // Add search query to recent searches
        trackEvent("Search", { 
            search_string: searchQuery,
            content_name: result.title,
            content_type: result.type
        });
        addToRecentSearches(searchQuery);
        navigate(result.link);
        onClose();
    };


    // Handle recent search click
    const handleRecentSearchClick = (searchTerm) => {
        setSearchQuery(searchTerm);
        performSearch(searchTerm);
    };

    // Add search query to recent searches
    const addToRecentSearches = (query) => {
        if (!query.trim()) return;
        
        const normalizedQuery = query.trim();
        setRecentSearches(prev => {
            // Remove if already exists
            const filtered = prev.filter(search => search.query !== normalizedQuery);
            // Add to beginning with timestamp
            const newSearch = {
                query: normalizedQuery,
                timestamp: Date.now(),
                resultCount: searchResults.length
            };
            // Keep only last 10 searches
            return [newSearch, ...filtered].slice(0, 10);
        });
    };

    // Remove specific search from recent searches
    const removeRecentSearch = (queryToRemove) => {
        setRecentSearches(prev => prev.filter(search => search.query !== queryToRemove));
    };

    // Clear all recent searches
    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('urbanPilgrimRecentSearches');
    };

    // Format timestamp for display
    const formatTimestamp = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    // Handle search form submission
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            trackEvent("Search", { 
                search_string: searchQuery 
            });
            addToRecentSearches(searchQuery);
        }
    };


    return (
        <motion.div
            className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-2xl">
                <IoClose />
            </button>
            <div className="relative w-full max-w-3xl p-6">
                {/* Search bar */}
                <form onSubmit={handleSearchSubmit} className="mb-6">
                    <div className="flex items-center border border-black/30 rounded-lg overflow-hidden shadow-sm">
                        <input
                            type="text"
                            placeholder="Search for titles, descriptions, or tags..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full px-4 py-2 text-lg outline-none bg-transparent"
                        />
                        <button type="submit" className="p-2 hover:bg-gray-100 transition-colors">
                            <IoSearch className="text-2xl" />
                        </button>
                    </div>
                </form>

                {/* Search Results */}
                {searchQuery && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-gray-800 text-lg">
                                Search Results ({searchResults.length})
                            </span>
                            {isSearching && (
                                <span className="text-sm text-gray-500">Searching...</span>
                            )}
                        </div>
                        
                        {searchResults.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {searchResults.map((result, index) => (
                                    <div
                                        key={`${result.type}-${result.id}-${index}`}
                                        onClick={() => handleResultClick(result)}
                                        className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Result Image */}
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                            {result.image ? (
                                                <img 
                                                    src={result.image} 
                                                    alt={result.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                                    <span className="text-gray-500 text-xs">No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Result Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-800 truncate">
                                                {result.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                    {result.type.replace('-', ' ')}
                                                </span>
                                                {result.category && (
                                                    <span className="text-gray-500">• {result.category}</span>
                                                )}
                                                {result.location && (
                                                    <span className="text-gray-500">• {result.location}</span>
                                                )}
                                                {result.price && (
                                                    <span className="text-green-600 font-medium">₹{result.price}</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Navigation Arrow */}
                                        <div className="text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !isSearching && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No results found for "{searchQuery}"</p>
                                <p className="text-sm mt-1">Try different keywords or check your spelling</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Recent Searches */}
                {!searchQuery && (
                    <div className="border border-black/30 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-gray-800 text-lg">
                                Recent Searches {recentSearches.length > 0 && `(${recentSearches.length})`}
                            </span>
                            {recentSearches.length > 0 && (
                                <button 
                                    onClick={clearRecentSearches}
                                    className="text-sm text-gray-800 hover:text-gray-600 transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        
                        {recentSearches.length > 0 ? (
                            <div className="space-y-2">
                                {recentSearches.map((search, idx) => (
                                    <div key={idx} className="flex items-center justify-between group">
                                        <button
                                            onClick={() => handleRecentSearchClick(search.query)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex-1 text-left"
                                        >
                                            <IoSearch className="text-gray-400 text-sm" />
                                            <span className="text-gray-700 font-medium">{search.query}</span>
                                            <span className="text-xs text-gray-500">
                                                {search.resultCount > 0 ? `${search.resultCount} results` : 'No results'}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-auto">
                                                {formatTimestamp(search.timestamp)}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => removeRecentSearch(search.query)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200"
                                            title="Remove from recent searches"
                                        >
                                            <IoClose className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <IoSearch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No recent searches</p>
                                <p className="text-sm mt-1">Start searching to see your history here</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
