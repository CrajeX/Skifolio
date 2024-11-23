import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Ensure auth is imported
import { collection, getDocs, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const JobSearch = () => {
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [expandedJobId, setExpandedJobId] = useState(null);
    const [userAverage, setUserAverage] = useState(null); // User's average score

    // Fetch user average score and job data from Firestore
    useEffect(() => {
        const fetchUserAverageScore = async () => {
            try {
                if (auth.currentUser) {
                    const userRef = doc(db, 'applicants', auth.currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setUserAverage(parseFloat(userData.skills?.average || 0)); // Parse as a number
                    } else {
                        console.log("No such user document!");
                    }
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        const fetchJobs = async () => {
            try {
                const jobsCollection = collection(db, 'jobs');
                const jobSnapshot = await getDocs(jobsCollection);

                const jobList = jobSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    averageScore: parseFloat(doc.data().averageScore || 0), // Parse as a number
                }));

                setJobs(jobList);
                setFilteredJobs(jobList); // Initially show all jobs
            } catch (error) {
                console.error('Error fetching jobs:', error);
            }
        };

        fetchUserAverageScore();
        fetchJobs();
    }, []);

    // Filter jobs dynamically based on the search term
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        const filtered = jobs.filter((job) =>
            job.title.toLowerCase().includes(e.target.value.toLowerCase()) ||
            job.description.toLowerCase().includes(e.target.value.toLowerCase())
        );
        setFilteredJobs(filtered);
    };

    // Toggle job description visibility
    const toggleJobDescription = (jobId) => {
        setExpandedJobId(expandedJobId === jobId ? null : jobId);
    };

    // Filter jobs where user surpasses or meets the job's average score
    const highestEligibleJobs = filteredJobs.filter((job) => {
        const jobAvgScore = job.averageScore;
        const userAvgScore = userAverage;
        return userAvgScore !== null && userAvgScore >= jobAvgScore; // Show jobs user surpasses
    });

    // Handle the job application
    const handleApply = async (jobId, e) => {
        e.stopPropagation();
        if (auth.currentUser) {
            try {
                const userId = auth.currentUser.uid;
                const userRef = doc(db, 'applicants', userId);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    console.error("User data not found!");
                    return;
                }

                const userData = userSnap.data();
                const { name, resumeURL, certifications = [], githubLink, email } = userData;

                // Fetch user submissions
                const submissionsRef = collection(db, 'applicants', userId, 'submissions');
                const submissionSnapshot = await getDocs(submissionsRef);

                const submissions = submissionSnapshot.docs.map((doc) => ({
                    id: doc.id, // The unique submission ID
                    demoVideoLink: doc.data().demoVideoLink || "",
                    liveDemoLink: doc.data().liveDemoLink || "",
                    scores: doc.data().scores || { css: 0, html: 0, javascript: 0 },
                    timestamp: doc.data().timestamp || null,
                }));

                // Save application data
                const applicationRef = doc(db, 'jobs', jobId, 'applications', userId);
                const applicationData = {
                    userId,
                    jobId,
                    appliedAt: Timestamp.now(),
                    name, // User's name
                    resumeURL, // Resume link
                    certifications, // User's certificates
                    githubLink, // GitHub profile link
                    email, // User's email
                    submissions, // Submissions fetched
                };

                await setDoc(applicationRef, applicationData);
                console.log(`Applied to job with ID: ${jobId} successfully.`);
            } catch (error) {
                console.error("Error applying to job:", error);
            }
        } else {
            console.log("No user logged in");
        }
    };

    return (
        <div id="job-search-container" style={{ padding: '20px' }}>
            <h2>Search Jobs</h2>

            {/* Display user's average score */}
            <div style={{ marginBottom: '20px' }}>
                {userAverage !== null ? (
                    <>
                        {/* <h3>Your Average Score</h3>
                        <p><strong>Average Score: </strong>{userAverage.toFixed(2)}%</p> */}
                    </>
                ) : (
                    <p></p>
                )}
            </div>

            <input
                type="text"
                placeholder="Search for jobs..."
                value={searchTerm}
                onChange={handleSearch}
                style={{ marginBottom: '20px', width: '100%' }}
            />

            <div>
                <h3>Highest Eligible Jobs</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {highestEligibleJobs.length > 0 ? (
                        highestEligibleJobs.map((job) => (
                            <div
                                key={job.id}
                                style={{
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    width: '200px',
                                    cursor: 'pointer',
                                    background: expandedJobId === job.id ? '#f9f9f9' : '#fff',
                                }}
                                onClick={() => toggleJobDescription(job.id)}
                            >
                                <h3>{job.title}</h3>
                                <p><strong>Company:</strong> {job.companyName}</p>
                                <p><strong>Location:</strong> {job.location}</p>
                                {/* <p><strong>Job Average Score:</strong> {job.averageScore.toFixed(2)}%</p> */}

                                {expandedJobId === job.id && (
                                    <>
                                        <p>{job.description}</p>
                                        <button
                                            onClick={(e) => handleApply(job.id, e)}
                                            style={{
                                                backgroundColor: '#007bff',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '8px 12px',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <p>No eligible jobs found.</p>
                    )}
                </div>
            </div>

            <div>
                <h3>All Available Jobs</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {filteredJobs.map((job) => (
                        <div
                            key={job.id}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '10px',
                                width: '200px',
                                cursor: 'pointer',
                                background: expandedJobId === job.id ? '#f9f9f9' : '#fff',
                            }}
                            onClick={() => toggleJobDescription(job.id)}
                        >
                            <h3>{job.title}</h3>
                            <p><strong>Company:</strong> {job.companyName}</p>
                            <p><strong>Location:</strong> {job.location}</p>

                            {expandedJobId === job.id && (
                                <>
                                    <p>{job.description}</p>
                                    <button
                                        onClick={(e) => handleApply(job.id, e)}
                                        style={{
                                            backgroundColor: '#007bff',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '8px 12px',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Apply
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default JobSearch;
