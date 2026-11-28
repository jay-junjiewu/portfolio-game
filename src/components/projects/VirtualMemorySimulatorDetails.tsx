const VirtualMemorySimulatorDetails = () => {
  return (
    <section className="project-detail">
      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/vmsim"
          target="_blank"
          rel="noreferrer"
          className="pdf-link"
        >
          GitHub
        </a>
      </div>

      <h3>Key features</h3>
      <p>
        The simulator implements a multilevel page table with a set-associative TLB that supports
        optional ASID tagging for multiprocess workloads. Page faults trigger frame allocation from
        a configurable pool, with optional paging to a swap area to handle evictions to disk.
      </p>
      <p>
        Four eviction policies are supported: FIFO, Clock, LRU, and Aging. Each can be selected at
        runtime to compare their performance characteristics on the same trace input.
      </p>

      <h3>Performance analysis</h3>
      <p>
        A detailed cost model counts the cycles spent on TLB hits, page table walks, and
        page faults. From these counts the simulator computes AMAT (Average Memory Access Time),
        giving a single scalar for comparing configurations. Results are emitted in both
        human-readable and JSON formats for further evaluation or scripted batch analysis.
      </p>
    </section>
  );
};

export default VirtualMemorySimulatorDetails;
