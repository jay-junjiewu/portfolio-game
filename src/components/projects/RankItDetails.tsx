import Picture from "../Picture";

const RankItDetails = () => {
  return (
    <section className="project-detail">
      <div className="project-links">
        <a
          href="https://github.com/FiveRankers/RankIt"
          target="_blank"
          rel="noreferrer"
          className="pdf-link"
        >
          GitHub
        </a>
      </div>

      <div className="hover-container">
        <Picture src="/assets/rankit/website_thumbnail.png" alt="RankIt website screenshot" />
      </div>

      <h3>My role: backend</h3>
      <p>
        I was responsible for the entire backend while my teammate built the frontend. The API is
        built with Express.js in a Node.js environment, exposing RESTful endpoints for reading and
        writing ranking data. Firebase serves as the NoSQL database for real-time data storage, and
        Supabase handles image uploads and storage.
      </p>
    </section>
  );
};

export default RankItDetails;
