import Picture from "../Picture";

const HonoursThesisDetails = () => {
  return (
    <section className="project-detail">
      <h3>Model architecture</h3>
      <p>
        A 12.5 million parameter Conformer encoder turns 80-bin log-Mel spectrograms into
        speech features at every layer. It is pretrained with CTC on LibriSpeech and then AMI, then
        frozen. Three lightweight classification heads mix the encoder layers, pool them over time,
        and average their outputs to classify each recording as MCI or healthy.
      </p>

      <div className="hover-container">
        <Picture
          src="/assets/honours-thesis/architecture.png"
          alt="Model architecture: speech to log-Mel spectrogram, a 12.5M-parameter Conformer encoder with CTC pretraining, and three classification heads averaged into an MCI or healthy prediction"
          style={{ width: "100%" }}
        />
      </div>

      <div className="pdf-container">
        <a
          href="/assets/honours-thesis/architecture.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="pdf-link"
        >
          Full-Resolution Diagram
        </a>
      </div>

      <h3>Training</h3>
      <p>
        The Conformer combines convolution with multi-head self-attention to capture both local and
        long-range structure in speech. I ran distributed, mixed-precision GPU training on an HPC
        cluster, fine-tuned pretrained transformer and self-supervised speech models for a small
        clinical dataset, and validated design choices with ablation studies against
        state-of-the-art baselines.
      </p>
    </section>
  );
};

export default HonoursThesisDetails;
