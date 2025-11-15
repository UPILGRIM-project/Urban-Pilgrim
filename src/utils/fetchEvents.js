import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { setAllEvents } from '../features/eventsSlice';

// Helper to map events into unified format
const mapEvent = (id, type, card, createdAt, data) => ({
    id,
    title: card.title || type,
    image: card.image || card.thumbnail || '',
    tags: card.category ? [card.category] : [],
    price: card.price || '0',
    location: card.location || card.subCategory || 'Online',
    type,
    createdAt: createdAt || new Date().toISOString(),
    data
});

// Fetch all events from multiple sources
export const fetchAllEvents = async (dispatch) => {
    try {
        const allEvents = [];

        /** ---------------- RETREATS ---------------- **/
        try {
            const retreatsRef = doc(db, 'pilgrim_retreat/user-uid/retreats/data');
            const retreatsSnapshot = await getDoc(retreatsRef);
            if (retreatsSnapshot.exists()) {
                const retreatsData = retreatsSnapshot.data();
                Object.keys(retreatsData).forEach((key) => {
                    const retreat = retreatsData[key];
                    if (retreat?.pilgrimRetreatCard) {
                        allEvents.push(
                            mapEvent(
                                `retreat-${key}`,
                                'retreat',
                                retreat.pilgrimRetreatCard,
                                retreat.createdAt,
                                retreat
                            )
                        );
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching retreats:", error);
        }

        /** ---------------- GUIDES ---------------- **/
        try {
            const guidesRef = doc(db, 'pilgrim_guides/pilgrim_guides/guides/data');
            const guidesSnapshot = await getDoc(guidesRef);
            if (guidesSnapshot.exists()) {
                const guidesData = guidesSnapshot.data();
                if (guidesData.slides) {
                    const slidesArray = Object.values(guidesData.slides); // turn {0: {...}, 1: {...}} → [{...}, {...}]
                  
                    slidesArray.forEach((guide, index) => {
                      if (guide?.guideCard) {
                        allEvents.push(
                          mapEvent(
                            `guide-${index}`,
                            'guide',
                            guide.guideCard,
                            guide.createdAt,
                            guide
                          )
                        );
                      }
                    });
                  }
                  
            }
        } catch (error) {
            console.error("Error fetching guides:", error);
        }

        /** ---------------- LIVE SESSIONS ---------------- **/
        try {
            const liveSessionsRef = doc(db, 'pilgrim_sessions/pilgrim_sessions/sessions/liveSession');
            const liveSessionsSnapshot = await getDoc(liveSessionsRef);
        
            if (liveSessionsSnapshot.exists()) {
                const liveSessionsData = liveSessionsSnapshot.data();
        
                if (liveSessionsData.slides) {
                    // convert object → array
                    const slidesArray = Object.values(liveSessionsData.slides);
        
                    slidesArray.forEach((session, index) => {
                        if (session?.liveSessionCard) {
                            allEvents.push(
                                mapEvent(
                                    `live-${index}`,
                                    'live-session',
                                    session.liveSessionCard,
                                    session.createdAt,
                                    session
                                )
                            );
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching live sessions:", error);
        }        

        /** ---------------- RECORDED PROGRAMS ---------------- **/
        try {
            const recordedRef = doc(db, 'pilgrim_sessions/pilgrim_sessions/sessions/recordedSession');
            const recordedSnapshot = await getDoc(recordedRef);
            if (recordedSnapshot.exists()) {
                const recordedData = recordedSnapshot.data();
                if (recordedData.slides) {
                    const slidesArray = Object.values(recordedData.slides);
                    slidesArray.forEach((program, index) => {
                        if (program?.recordedProgramCard) {
                            allEvents.push(
                                mapEvent(
                                    `recorded-${index}`,
                                    'recorded-session',
                                    program.recordedProgramCard,
                                    program.createdAt,
                                    program
                                )
                            );
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching recorded programs:", error);
        }

        /** ---------------- WORKSHOPS ---------------- **/
        try {
            const workshopsRef = collection(db, 'workshops');
            const workshopsSnapshot = await getDocs(workshopsRef);
            
            workshopsSnapshot.forEach((doc) => {
                const workshop = doc.data();
                if (workshop?.title) {
                    allEvents.push(
                        mapEvent(
                            `workshop-${doc.id}`,
                            'workshop',
                            {
                                title: workshop.title,
                                image: workshop.thumbnail || '',
                                category: workshop.category || 'Workshop',
                                price: workshop.price || '0',
                                location: workshop.location || 'TBD'
                            },
                            workshop.createdAt,
                            workshop
                        )
                    );
                }
            });
        } catch (error) {
            console.error("Error fetching workshops:", error);
        }

        // console.log("allEvents: ", allEvents)
        
        /** ---------------- FILTER & SORT ---------------- **/
        // Relaxed filters: allow events without image (UI has fallback) and without recency limit
        const sortedEvents = allEvents
            .filter(event => event.title)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        /** ---------------- FORMAT FOR REDUX ---------------- **/
        const eventsObject = {};
        sortedEvents.forEach(event => {
            eventsObject[event.id] = {
                upcomingSessionCard: {
                    title: event.title,
                    image: event.image,
                    category: event.tags[0] || '',
                    price: event.price,
                    location: event.location
                },
                type: event.type,
                createdAt: event.createdAt,
                originalData: event.data
            };
        });

        if (dispatch) {
            dispatch(setAllEvents(eventsObject));
        }

        return eventsObject;
    } catch (err) {
        console.error("Error fetching all events:", err);
        throw err;
    }
};
