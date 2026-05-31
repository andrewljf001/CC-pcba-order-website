/**
 * Seed script: insert PCBA article into the posts table
 * Run on server: node scripts/seed-pcba-article.js
 *
 * Or use admin panel → Blog → New Post and paste the content below.
 */

const slug    = 'what-is-pcba-complete-guide-2026';
const title   = 'What Is PCBA? The Complete Guide to PCB Assembly (2026)';
const excerpt = 'PCBA (Printed Circuit Board Assembly) is the process of soldering electronic components onto a bare PCB. Learn about SMT, DIP, turnkey assembly, and how to choose a reliable PCBA partner.';
const tags    = JSON.stringify(['PCBA', 'SMT', 'Guide', 'Electronics']);
const author  = 'PCBAForge Team';
const status  = 'published';

const content = `
<p>If you've ever held a smartphone, a smart thermostat, or an industrial controller, you've held the end product of PCBA — <strong>Printed Circuit Board Assembly</strong>. Yet for many engineers and product managers ordering their first prototype run, the term "PCBA" blends with "PCB" in confusing ways. This guide explains what PCBA actually is, how the process works step by step, and what to look for when choosing an assembly partner.</p>

<h2>PCB vs PCBA: What's the Difference?</h2>

<p>A <strong>PCB (Printed Circuit Board)</strong> is simply the bare board — the green (or black, or blue) fibreglass panel with copper traces, drilled holes, and surface pads. It is the skeleton. By itself, it cannot do anything.</p>

<p><strong>PCBA</strong> is the completed assembly: the bare PCB with all electronic components — resistors, capacitors, ICs, connectors, and more — soldered onto it. The PCBA is a functional circuit that can be powered up and tested. This distinction matters because when you order from a supplier, you need to specify whether you want the bare board alone, or the fully assembled product.</p>

<h2>The PCBA Process: Step by Step</h2>

<h3>1. PCB Fabrication</h3>
<p>Before any components can be placed, the bare board must be manufactured. This involves etching copper traces from a laminate panel, drilling vias and through-holes, applying solder mask, and adding the surface finish (HASL, ENIG, OSP). Layer counts range from 1-layer (simple single-sided boards) up to 16+ layers for high-density RF or digital designs.</p>

<h3>2. Solder Paste Printing</h3>
<p>For SMT (surface-mount) components, a stainless-steel stencil is placed over the PCB. Solder paste — a grey mixture of tiny solder balls and flux — is squeegeed through the stencil apertures onto the SMD pads. Correct paste volume is critical: too little and joints will be weak; too much and bridges will form between adjacent pads.</p>

<h3>3. SMT Component Placement</h3>
<p>A pick-and-place machine picks components from tape reels or trays and places them onto the solder paste with high accuracy. Modern machines handle components as small as <strong>01005 (0.4 × 0.2 mm)</strong> and can place thousands of components per hour. The smallest passive components like 0201 resistors are barely visible to the naked eye.</p>

<h3>4. Reflow Soldering</h3>
<p>The loaded PCB travels through a reflow oven with a precise temperature profile: preheat → soak → reflow peak (typically 235–250 °C for lead-free) → cooling. The solder paste melts, wets the pad and component lead, and solidifies into a solid joint. Good profiling is essential for BGA and QFN packages where solder is hidden beneath the component body.</p>

<h3>5. Through-Hole / DIP Insertion</h3>
<p>Not all components are surface-mount. Connectors, large capacitors, transformers, and some ICs still use through-hole leads that pass through drilled holes and are soldered from the other side. This is called <strong>DIP (Dual In-line Package)</strong> assembly, or more broadly, through-hole assembly. Methods include manual soldering, selective soldering machines, or wave soldering.</p>

<h3>6. Inspection</h3>
<p>Quality control is a major differentiator between PCBA shops. Good shops run:</p>
<ul>
  <li><strong>AOI (Automated Optical Inspection)</strong> — a camera system checks every solder joint and component placement against a reference image. It catches missing components, wrong polarity, bridges, and tombstoning.</li>
  <li><strong>X-Ray Inspection</strong> — essential for BGAs, QFNs, and CSPs where solder balls are hidden. X-ray shows voids, bridges, and poor wetting underneath the package.</li>
  <li><strong>ICT / Functional Test</strong> — the assembled board is powered up and tested against a test specification. This is the only way to confirm the board actually works end-to-end.</li>
</ul>

<h2>SMT vs DIP vs Turnkey: Which Do You Need?</h2>

<table style="width:100%;border-collapse:collapse;font-size:.9rem;margin:1.2rem 0">
  <thead>
    <tr style="background:#f0fdf4">
      <th style="border:1px solid #d9e2ee;padding:.6rem .8rem;text-align:left">Service Type</th>
      <th style="border:1px solid #d9e2ee;padding:.6rem .8rem;text-align:left">What's Included</th>
      <th style="border:1px solid #d9e2ee;padding:.6rem .8rem;text-align:left">Best For</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem"><strong>PCB Only</strong></td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">Bare board fabrication</td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">In-house assembly, board suppliers</td>
    </tr>
    <tr style="background:#fbfdff">
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem"><strong>SMT CMS</strong></td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">Assembly only, you supply components</td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">Cost control, sourcing already done</td>
    </tr>
    <tr>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem"><strong>SMT + DIP</strong></td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">SMT and through-hole in one run</td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">Mixed technology boards</td>
    </tr>
    <tr style="background:#fbfdff">
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem"><strong>Turnkey PCBA</strong></td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">PCB + components sourced + assembly + test</td>
      <td style="border:1px solid #d9e2ee;padding:.6rem .8rem">Prototypes, one-stop convenience</td>
    </tr>
  </tbody>
</table>

<p>For prototypes and small batches, <strong>Turnkey PCBA</strong> is almost always the right choice. You hand over the Gerber files and BOM; the supplier handles everything else. Yes, the unit cost is higher, but you save enormous time and avoid the headache of sourcing 50+ line items from distributors.</p>

<h2>What Files Do You Need to Provide?</h2>

<p>A complete PCBA order requires three core files:</p>
<ul>
  <li><strong>Gerber Files</strong> (.gbr / .ger) — defines the PCB layers: copper, drill, silkscreen, solder mask. Export from your EDA tool (KiCad, Altium, Eagle) as a ZIP archive.</li>
  <li><strong>BOM (Bill of Materials)</strong> — a spreadsheet listing every component by reference designator (R1, C4, U2...), part number, value, and package. Critically, include the MPN (Manufacturer Part Number) for each part so the supplier can source the right component.</li>
  <li><strong>Centroid / Pick-and-Place File</strong> — an XY coordinates file exported from your EDA tool. It tells the pick-and-place machine exactly where to place each component.</li>
</ul>

<blockquote>💡 <strong>Tip:</strong> Always do a DFM (Design for Manufacturability) check before submitting. Check minimum trace widths, pad sizes for your components, solder mask expansion, and fiducial markers for SMT.</blockquote>

<h2>Quality Checklist: What to Look for in a PCBA Partner</h2>

<p>Not all PCBA suppliers are equal. Here's what separates reliable partners from risky ones:</p>

<ul>
  <li>✅ <strong>AOI is standard</strong> — not optional. Every assembled board should go through automated optical inspection.</li>
  <li>✅ <strong>X-Ray capability</strong> — required if you use BGA, QFN, or LGA packages.</li>
  <li>✅ <strong>Functional testing</strong> — the only real proof your board works. Ask explicitly whether power-on testing is included.</li>
  <li>✅ <strong>IPC Class 2 or Class 3</strong> — IPC-A-610 is the global standard for solder joint acceptability. Class 3 applies to high-reliability applications (medical, aerospace).</li>
  <li>✅ <strong>DFM review</strong> — a good supplier reviews your files before production and flags potential issues.</li>
  <li>✅ <strong>Small batch support</strong> — many large factories have MOQs of 100+. Look for suppliers who handle 5–50 unit runs without huge setup fees.</li>
</ul>

<h2>Common PCBA Issues and How to Avoid Them</h2>

<p><strong>Tombstoning</strong> — small two-terminal components (0402, 0201) stand up vertically during reflow due to unequal thermal mass on each pad. Solution: symmetrical pad design and proper reflow profiling.</p>

<p><strong>Solder Bridges</strong> — excess solder connects adjacent pads, causing short circuits. Caused by too much paste, wrong stencil aperture, or component misalignment. AOI catches most bridges.</p>

<p><strong>BGA Voids</strong> — air pockets under BGA solder balls reduce reliability. X-ray inspection is the only way to detect these. Good flux chemistry and paste volume control minimise voids.</p>

<p><strong>Wrong Components</strong> — incorrect part sourced due to ambiguous BOM (value-only, no MPN). Always include manufacturer part numbers in your BOM.</p>

<h2>PCBA Lead Time and Cost Drivers</h2>

<p>For small batches (5–50 units), expect:</p>
<ul>
  <li><strong>PCB fabrication:</strong> 3–5 business days for standard 2-layer FR4</li>
  <li><strong>Component sourcing:</strong> 3–7 days if parts are in stock at distributor</li>
  <li><strong>Assembly:</strong> 1–3 days after parts and boards are ready</li>
  <li><strong>Testing:</strong> 1–2 days for functional verification</li>
  <li><strong>Total typical lead time:</strong> 7–14 business days</li>
</ul>

<p>Cost is driven by: board size and layer count, number of unique component types, component pitch and package complexity (0201 vs 01005, BGA vs SOIC), quantity, and whether components are customer-supplied or sourced by the assembler.</p>

<h2>Summary</h2>

<p>PCBA is the complete process of turning bare PCB panels and electronic components into a functional circuit assembly. Understanding the process — from solder paste printing through reflow, DIP insertion, AOI, and functional test — helps you write better specifications, choose better suppliers, and avoid common pitfalls.</p>

<p>At PCBAForge, we specialise in small batches (5–100 units) with full AOI inspection, X-ray for BGAs, and functional testing by our engineers. Upload your Gerber + BOM and get an estimate instantly.</p>
`;

// ── For running directly on server ────────────────────
if (require.main === module) {
  require('dotenv').config();
  const pool = require('../database');
  const { v4: uuidv4 } = require('uuid');

  (async () => {
    try {
      // Check if slug already exists
      const { rows: ex } = await pool.query('SELECT id FROM posts WHERE slug=$1', [slug]);
      if (ex.length) {
        console.log('Article already exists, updating...');
        await pool.query(
          `UPDATE posts SET title=$1, excerpt=$2, content=$3, tags=$4, author=$5, status=$6, updated_at=datetime('now') WHERE slug=$7`,
          [title, excerpt, content, tags, author, status, slug]
        );
        console.log('✅ Article updated:', slug);
      } else {
        await pool.query(
          `INSERT INTO posts (id, slug, title, excerpt, content, tags, status, author, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, datetime('now'))`,
          [uuidv4(), slug, title, excerpt, content, tags, status, author]
        );
        console.log('✅ Article inserted:', slug);
      }
    } catch (e) {
      console.error('Error:', e.message);
    } finally {
      process.exit(0);
    }
  })();
}

module.exports = { slug, title, excerpt, content, tags, author, status };
