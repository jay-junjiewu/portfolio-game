import Picture from "../Picture";

const RankItDetails = () => {
  return (
    <section className="project-detail">
      <p>
        RankIt is a platform for UNSW students to rank categories related to university life —
        courses, food, restaurants, toilets, and more. Built over a 48-hour hackathon by a
        two-person team.
      </p>

      <div className="project-links">
        <a
          href="https://github.com/FiveRankers/RankIt"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          GitHub
        </a>
      </div>

      <div className="hover-container">
        <Picture src="/assets/rankit/website_thumbnail.png" alt="RankIt website screenshot" />
      </div>

      <h3>My role — backend</h3>
      <p>
        I was responsible for the entire backend while my teammate built the frontend. The API is
        built with Express.js in a Node.js environment, exposing RESTful endpoints for reading and
        writing ranking data. Firebase serves as the NoSQL database for real-time data storage, and
        Supabase handles image uploads and storage.
      </p>

      <h3>Frontend (teammate)</h3>
      <p>
        The frontend was developed with React and TypeScript, consuming the Express API. The two
        layers were integrated and the full product was delivered within the hackathon time limit.
      </p>
    </section>
  );
};

export default RankItDetails;
