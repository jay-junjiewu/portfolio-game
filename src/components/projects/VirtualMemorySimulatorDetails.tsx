const VirtualMemorySimulatorDetails = () => {
  return (
    <section className="project-detail">
      <p>
        vmsim is a C++ virtual memory system emulator that replays memory-access traces through a
        configurable VM subsystem, enabling quantitative analysis of memory-system design tradeoffs.
      </p>

      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/vmsim"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          GitHub
        </a>
      </div>

      <h3>Key features</h3>
      <p>
        The simulator implements a multi-level page table with a set-associative TLB that supports
        optional ASID tagging for multi-process workloads. Page faults trigger frame allocation from
        a configurable pool, with optional swap-backed paging to handle evictions to disk.
      </p>
      <p>
        Five eviction policies are supported: FIFO, Clock, LRU, and Aging. Each can be selected at
        runtime to compare their performance characteristics on the same trace input.
      </p>

      <h3>Performance analysis</h3>
      <p>
        A detailed cycle-based cost model tracks the latency of TLB hits, page-table walks, and
        page faults. From these counts the simulator computes AMAT (Average Memory Access Time),
        giving a single scalar for comparing configurations. Results are emitted in both
        human-readable and JSON formats for further evaluation or scripted batch analysis.
      </p>
    </section>
  );
};

export default VirtualMemorySimulatorDetails;
