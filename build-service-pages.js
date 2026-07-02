const fs = require('fs');
const path = require('path');

const baseDir = 'bratton-pt-v3/services';

// HTML template
function pageHTML(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} — Bratton Physical Therapy | Slidell, LA</title>
  <meta name="description" content="${data.metaDesc}">
  <meta property="og:title" content="${data.title} — Bratton Physical Therapy">
  <meta property="og:description" content="${data.metaDesc}">
  <meta property="og:url" content="/services/${data.slug}/">
  <meta property="og:site_name" content="Bratton Physical Therapy">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${data.image}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/css/main.css">
  <link rel="stylesheet" href="/css/header.css">
  <style>
    /* === SERVICE PAGE LAYOUT (v2-style) === */
    .svc-hero{background:var(--primary);color:var(--white);text-align:center;padding:clamp(36px,8vw,60px) 0}
    .svc-hero h1{color:var(--white);margin-bottom:0}

    .svc-content{padding:clamp(32px,6vw,56px) 0}
    .svc-content .container{max-width:var(--max-width)}

    /* Two-column: image left, text right (v2 style) */
    .svc-layout{display:flex;gap:clamp(24px,4vw,40px);align-items:flex-start}
    .svc-layout__img{flex:0 0 clamp(260px,35%,400px)}
    .svc-layout__img img{border-radius:var(--radius-md);width:100%;height:auto;box-shadow:var(--shadow-md)}
    .svc-layout__body{flex:1;min-width:0}
    .svc-layout__body h2{font-size:1.3rem;margin-top:24px;margin-bottom:8px}
    .svc-layout__body h3{font-size:1.1rem;margin-top:20px;margin-bottom:6px;color:var(--dark)}
    .svc-layout__body p{margin-bottom:14px;line-height:1.7}
    .svc-layout__body ul,.svc-layout__body ol{margin:0 0 16px 20px;line-height:1.7}
    .svc-layout__body ul li,.svc-layout__body ol li{margin-bottom:6px}

    /* Simple CTA row at bottom (not a blue box) */
    .svc-cta-row{text-align:center;padding:clamp(32px,6vw,48px) 0;border-top:2px solid var(--light-gray);margin-top:clamp(32px,6vw,48px)}
    .svc-cta-row p{font-size:1.1rem;font-weight:600;margin-bottom:16px}

    @media(max-width:768px){
      .svc-layout{flex-direction:column}
      .svc-layout__img{flex:auto;max-width:100%}
    }
  </style>
</head>
<body>
<div id="site-header"></div>
<script>
  fetch('/templates/header.html')
    .then(function(r){return r.text()})
    .then(function(h){document.getElementById('site-header').innerHTML=h});
</script>
<main>
  <section class="svc-hero">
    <div class="container">
      <h1>${data.title}</h1>
    </div>
  </section>

  <section class="svc-content">
    <div class="container">
      <div class="svc-layout">
        <div class="svc-layout__img">
          <img src="${data.image}" alt="${data.title}" loading="lazy">
        </div>
        <div class="svc-layout__body">
          ${data.content}
        </div>
      </div>

      <div class="svc-cta-row">
        <p>Ready to get started? Call us or request an appointment today.</p>
        <a href="tel:9856415825" class="btn btn--accent btn--lg">Call Now: (985) 641-5825</a>
      </div>
    </div>
  </section>
</main>

<div id="site-footer"></div>
<script>
  fetch('/templates/footer.html')
    .then(function(r){return r.text()})
    .then(function(f){document.getElementById('site-footer').innerHTML=f});
</script>
<script src="/js/main.js"></script>
</body>
</html>`;
}

// ===== SERVICE DATA =====
const services = [
  {
    slug: 'therapeutic-exercise',
    title: 'Therapeutic Exercise',
    metaDesc: 'Therapeutic exercise physical therapy in Slidell, LA. Customized rehab programs for strength, flexibility, and function recovery. Call 985-641-5825.',
    image: '/files/services/therapeutic-exercise.jpg',
    content: `<p>The primary goal of physical therapy is usually to recover strength, flexibility, and function. In most cases, therapeutic exercise is an important component of the rehabilitation process. Therapeutic exercises involves movement of the body to facilitate recovery from limitations often associated with nerve, muscle, and/or joint problems.</p>
<h3>Therapeutic exercises is used to help people in need of:</h3>
<ul>
<li>Help with walking again</li>
<li>To improve circulation</li>
<li>To improve joint motion</li>
<li>To improve balance</li>
<li>To relax tight muscles</li>
<li>To release shortened or scarred tissue</li>
<li>To recover strength & power</li>
<li>To recover complex coordinated (sports-related) movements</li>
<li>For cardiorespiratory condition</li>
</ul>
<h3>Types of Therapeutic Exercises</h3>
<p>There are different types of therapeutic exercise that we provide based on our detailed assessment of your condition and your rehab goals. Physical therapists are experts at providing appropriate progressive therapeutic exercise programs for a given condition and where you are at in the recovery process. By varying frequency, intensity, and resistance, treatment goals can be achieved in an optimal timeframe.</p>
<h3>Here is a partial list of therapeutic exercises that may be appropriate for you:</h3>
<ol>
<li>Range of motion exercises</li>
<li>Proprioceptive neuromuscular facilitation</li>
<li>Isometric exercises</li>
<li>Isotonic resistance exercises</li>
<li>Isokinetic exercises</li>
<li>Manual resistive exercises</li>
<li>Aerobic/endurance exercises</li>
</ol>
<p>Therapeutic exercise is often an important component of a comprehensive treatment plan. The key is customizing the plan for your specific needs.</p>
<p>For more information about how therapeutic exercise can help you, please give us a call (985) 641-5825.</p>`
  },
  {
    slug: 'dry-needling-certified',
    title: 'Dry Needling Certified',
    metaDesc: 'Certified dry needling physical therapy in Slidell, LA. Safe, effective treatment for trigger points, muscle pain, and myofascial conditions. Call 985-641-5825.',
    image: '/files/services/dry-needling-certified.jpg',
    content: `<p>Dry Needling is also known as intramuscular stimulation (IMS) and trigger point dry needling (TDN). It is a safe, effective and efficient treatment used to:</p>
<ul>
<li>Relax myofascial trigger points, and</li>
<li>Restore normal muscle tones, muscle length, coordination, function and strength</li>
</ul>
<p>Dry needling involves insertion and repetitive manipulation of a "dry", solid filament needle in a trigger point in order to produce an involuntary spinal cord reflex, also known as a local twitch response (LTR). This results in lasting muscle relaxation due to the release of shortened bands of muscle fibers for overactive (tight) muscles or the activation of under-active (weak) muscles. Deactivation of the trigger points can bring immediate relief of symptoms, so the therapist can immediately train the muscles to work with the newly gained pain free range of motion (ROM).</p>
<h2>Dry Needling vs. Acupuncture</h2>
<p>Dry needling is similar to acupuncture in the sense that a dry, solid filament needle is inserted and manipulated under the skin to release endorphins and serum cortisol for pain relief. The difference is that dry needling is based on western neuroanatomy and modern scientific study of the musculoskeletal and nervous systems. Acupuncture is based on traditional Chinese medicine (TCM).</p>
<h2>Conditions Treated by Dry Needling</h2>
<ul>
<li>Head and Neck Pain — including whiplash and headaches / migraines, degenerative joint disease, degenerative disk disease</li>
<li>Otological (Ear) and Opthamological (Eye) Pain — including tinnitus and eye strain</li>
<li>Dental and Orthodontic Pain — including cavities, TMJ dysfunction, tooth impaction</li>
<li>Shoulder Pain — including rotator cuff muscle tears, bursitis, frozen shoulder, tendonitis and impingement syndrome</li>
<li>Elbow Pain — including tennis elbow and golfer's elbow</li>
<li>Hand and Wrist Pain — including carpal tunnel syndrome, DeQuervain's syndrome</li>
<li>Back and Hip Pain — including lumbar degenerative disc disease, arthritic changes and herniated discs</li>
<li>Knee Pain — including degenerative joint disease or osteoarthritis</li>
<li>Shin / Ankle / Foot Pain — including shin splints, gout, Morton's neuroma</li>
<li>Plantar Fasciitis (Heel Pain)</li>
<li>Acute and Chronic Tendonitis</li>
<li>Athletic and Sports-related Overuse Injuries</li>
<li>Post-surgical Pain</li>
<li>Post-traumatic Injuries, Motor Vehicle Accidents (MVA), and Work-related Injuries</li>
<li>Other Chronic Pain Conditions — including myofascial pain and myofascial pain syndrome (MPS)</li>
</ul>
<p style="text-align:center;font-weight:600;font-size:1.1rem;margin-top:24px">To learn more about our dry needling services or request an appointment, give us a call at (985) 641-5825</p>`
  },
  {
    slug: 'cupping',
    title: 'Cupping',
    metaDesc: 'Cupping therapy in Slidell, LA. A safe alternative treatment for chronic neck and back pain performed by trained physical therapists. Call 985-641-5825.',
    image: '/files/services/cupping.jpg',
    content: `<p>Cupping is an ancient treatment that uses suction to pull toxins from the body. An athlete's endorsement of cupping raised interest and many people have since turned to cupping for treatment. In addition, more people are also looking for alternative, non-invasive treatment methods.</p>
<p>It's believed that the effect of suction on the skin helps increase blood flow and promotes healing; however, the way in which cupping may have an effect on the body is unclear. A study in <em>PLoS One</em> researchers concluded that cupping could be effective in treating the pain and disability associated with chronic neck pain and chronic low-back pain in the short term.</p>
<p>Cupping is generally safe for healthy people when performed by one of our trained health professionals.</p>
<p>Some of the side effects like bruising and soreness are possible.</p>
<p><strong>Ask your physical therapist how cupping might help you.</strong></p>
<p>Cupping is a helpful alternative treatment for some. Please share your complete health history with your therapist and they will discuss the benefits and possible side effects of cupping to make sure it is right for you.</p>
<p>Call Us Today at (985) 641-5825 for More Information</p>`
  },
  {
    slug: 'mckenzie-method',
    title: 'McKenzie Method',
    metaDesc: 'McKenzie Method (MDT) physical therapy in Slidell, LA. Evidence-based assessment and treatment for back, neck, and extremity problems. Call 985-641-5825.',
    image: '/files/services/mckenzie-method.jpg',
    content: `<h2>What is the McKenzie Method?</h2>
<p>Also known as Mechanical Diagnosis and Therapy (MDT), the McKenzie Method is a philosophy of active patient involvement and education that is trusted and used by practitioners and patients all over the world for back, neck, and extremity problems. An evidence-based approach, the key distinction of MDT is its initial assessment component — a safe and reliable means to accurately reach a diagnosis and only then make the appropriate treatment plan. Certified McKenzie clinicians have valid indicators to know right away whether — and uniquely how — the method will work for each patient.</p>
<h3>The Right Road to Restore Function</h3>
<p>For successful treatment, one must first be effectively evaluated. Pain is a symptom — not a diagnosis. Assessment is the first step!</p>
<p>The evidence has shown that the initial McKenzie assessment procedures performed by competent MDT clinicians are as reliable as costly diagnostic imaging (i.e., X-rays, MRIs) to determine the source of the problem and quickly identify those who will or will not respond to the treatment principles of MDT.</p>
<p>Through a series of repeated movements and positions, certified MDT practitioners assess two things as a result of these movements — symptomatic and mechanical response. Patterns of response can be determined for what makes symptoms better or worse. Patients are classified accordingly and an effective set of exercises is established based on a "directional preference." Typically this is achieved in only 3–5 visits!</p>
<h3>Three Steps to Success</h3>
<p><strong>STEP 1: Assessment</strong> — MDT provides a safe, logical guide to the most optimal treatment strategy for a specific patient. Unique to the McKenzie Method, the process begins with a thorough history and testing of repeated movements to identify distinct patterns of pain responses that are: objective, reproducible, and reliable. The most common and meaningful pattern of pain response is Centralization: when pain that has spread from the center of the back or neck down the leg or arm can reverse returning to the center of the back or neck, and eventually cease.</p>
<p><strong>STEP 2: Treatment</strong> — The basis of the McKenzie system is the patient's own ability for movements and forces to abolish the pain and restore function. A series of individualized exercises are prescribed subsequent to the patient's responses during the assessment process and — most critically — are based on the identified Directional Preference of movements that will centralize or abolish pain (i.e., extension or flexion, right or left lateral movement, etc.). Patients who do respond favorably with MDT can successfully treat themselves — and minimize the number of visits to the clinic — when provided the necessary knowledge and tools putting him or her in control of their treatment safely and effectively.</p>
<p><strong>STEP 3: Prevention</strong> — Patients who stick to the prescribed treatment protocols are less likely to have persistent problems. Thus, by learning how to self-treat the current problem, patients gain hands-on knowledge on how to minimize the risk of recurrence and how to quickly manage themselves if symptoms do occur. Need a McKenzie lumbar or cervical roll? Or McKenzie's self-help books, Treat Your Own Back or Treat Your Own Neck? Give us a call.</p>
<h3>Creating Independence</h3>
<p>McKenzie MDT is a proven methodology:</p>
<ul>
<li>Backed by years of research, evidence, and practice</li>
<li>Low cost, fast and effective, even for chronic pain</li>
<li>Non-invasive — no needles, no scalpel</li>
<li>Self-directed — we work with you and teach you</li>
<li>Be in control of your own symptom management</li>
<li>Gain life-long pain management and preventive skills</li>
</ul>
<h3>Proven goals of McKenzie MDT are to:</h3>
<p>Promote the body's potential to heal itself without medication, heat, cold, ultrasound, needles, surgery or endless visits to the clinic.</p>`
  },
  {
    slug: 'gait-balance-training',
    title: 'Gait / Balance Training',
    metaDesc: 'Gait and balance training physical therapy in Slidell, LA. Improve walking ability, prevent falls, and recover mobility. Call 985-641-5825.',
    image: '/files/services/gait-balance-training.jpg',
    content: `<p>Gait examination is the analysis of walking problems by visually examining the interaction of the low back and the joints of the thighs, legs, and feet during the various stages of walking.</p>
<p>When performing a gait examination various stages of walking are observed including, initial contact, loading response, mid stance, terminal stance, pre swing, mid swing, and terminal swing.</p>
<p>Many back, thigh, leg, ankle, and foot problems may be caused by or manifest themselves in subtle gait abnormalities.</p>
<p>Gait training involves retraining the patient to improve their ability to walk as close to normal again. This training may involve:</p>
<ul>
<li>Stretching</li>
<li>Strengthening</li>
<li>Endurance exercise</li>
<li>Balance exercises</li>
<li>Visual/video training with feedback</li>
<li>Verbal cues to improve walking patterns</li>
<li>Training on different surfaces (grass, stairs, pavement, uneven surfaces)</li>
</ul>
<p>There are a number of patients that can benefit from gait training including:</p>
<ul>
<li>Post-surgical hip, knee, ankle, foot patients</li>
<li>Post-fracture patients</li>
<li>Post-surgical spine surgery patients</li>
<li>Patients with injuries to joints</li>
<li>Patients with spinal cord injuries</li>
<li>Vestibular/vertigo patients</li>
<li>Neurologically involved patients</li>
<li>Patients at risk for falls</li>
<li>Stroke patients</li>
<li>Numerous others</li>
</ul>
<p>For more information about how we can help you or a loved one with our gait training services, please contact us (985) 641-5825.</p>`
  },
  {
    slug: 'blood-flow-restriction-therapy',
    title: 'Blood Flow Restriction Therapy',
    metaDesc: 'Blood Flow Restriction Therapy in Slidell, LA. Build strength with lighter loads using BFR — an innovative physical therapy technique. Call 985-641-5825.',
    image: '/files/services/blood-flow-restriction-therapy.jpg',
    content: `<p>Blood Flow Restriction (BFR) therapy is an innovative treatment technique that uses a specialized tourniquet system to partially restrict blood flow to exercising muscles. This allows patients to achieve significant strength gains while using much lighter weights than traditional strength training requires.</p>
<h2>How BFR Works</h2>
<p>During BFR training, a specialized cuff is applied to the upper portion of the arm or leg. The cuff is inflated to a specific pressure that reduces venous blood flow (blood leaving the muscle) while maintaining arterial blood flow (blood entering the muscle). When combined with low-load exercise (typically 20–30% of your maximum), this creates a metabolic environment that stimulates muscle growth and strength gains similar to those seen with heavy resistance training.</p>
<h2>Benefits of BFR Therapy</h2>
<ul>
<li>Builds muscle strength and size using light loads</li>
<li>Reduces stress on joints and healing tissues</li>
<li>Accelerates post-surgical recovery</li>
<li>Improves outcomes for patients who cannot tolerate heavy lifting</li>
<li>Safe and effective when administered by trained professionals</li>
</ul>
<h2>Who Can Benefit from BFR?</h2>
<p>BFR therapy is particularly beneficial for patients who are unable to lift heavy weights due to:</p>
<ul>
<li>Post-surgical rehabilitation (ACL reconstruction, meniscus repair, rotator cuff repair)</li>
<li>Joint pain and arthritis</li>
<li>Tendon injuries</li>
<li>Muscle atrophy after immobilization</li>
<li>General weakness and deconditioning</li>
</ul>
<h2>Is BFR Safe?</h2>
<p>When performed by a trained physical therapist, BFR is a safe and well-tolerated treatment. Your therapist will conduct a thorough screening to ensure BFR is appropriate for your specific condition and health status.</p>
<p>Contact us today at (985) 641-5825 to learn if Blood Flow Restriction Therapy is right for you.</p>`
  },
  {
    slug: 'strength-conditioning',
    title: 'Strength & Conditioning',
    metaDesc: 'Strength and conditioning physical therapy in Slidell, LA. Personalized strength training programs for rehabilitation and performance. Call 985-641-5825.',
    image: '/files/services/strength-conditioning.jpg',
    content: `<p>To strengthen your muscles, you need to lift, push, or pull weight. Stronger muscles can make it easier to do everyday things like get up from a chair, climb stairs, carry groceries, open jars, participate in sports/recreation, and even play with your grandchildren. Lower-body strength exercises also will improve your balance.</p>
<h2>Types of Strength Training</h2>
<p>There are a variety of different types of strength training modalities. Here are some of the types of strength training we often incorporate into a rehabilitation program:</p>
<ol>
<li>Isometrics</li>
<li>Isotonics</li>
<li>Isokinetics</li>
<li>Plyometrics</li>
<li>Eccentric Work</li>
</ol>
<h2>Therapeutic versus Strength Training for Muscle Hypertrophy (Growth)</h2>
<p>When rehabilitating muscles, tendons, joints, or after surgery, therapeutic exercise is most often the choice. Movements often involving nothing more than the resistance of body weight help nerves fire again and recruit muscles, causing them to contract.</p>
<p>Over time, external resistance may be applied to increase muscle fiber recruitment and to generate more force. It's a question of facilitating healing without overloading recovering body tissue.</p>
<p>This is where physical therapists are clear experts. Providing patients with the appropriate therapeutic exercise prescription is our specialty. It includes:</p>
<ul>
<li>the type of exercises to be utilized,</li>
<li>the frequency (number of times per day),</li>
<li>the intensity (amount of resistance), and</li>
<li>the duration (number of repetitions) an exercise is performed.</li>
</ul>
<p>Carefully monitoring progress during a therapeutic exercise program can optimize the recovery process.</p>
<h2>Exercises for Muscle Hypertrophy</h2>
<p>Exercises to increase muscle mass, in most cases require the use of heavier loads and extended periods of training (10 weeks or more). For this reason, training exercises that result in muscle hypertrophy are less commonly applied to a rehabilitation program.</p>
<p>Depending upon where you are in the recovery process and your treatment goals will dictate the type of exercise that is recommended.</p>
<h2>Contact Us Today at (985) 641-5825 to Learn More About How a Personalized Strength Training Program Can Help You.</h2>`
  },
  {
    slug: 'electrical-stimulation',
    title: 'Electrical Stimulation',
    metaDesc: 'Electrical stimulation / microcurrent therapy in Slidell, LA. Pain relief, tissue healing, and inflammation reduction. Call 985-641-5825.',
    image: '/files/services/electrical-stimulation.jpg',
    content: `<p>Microcurrent therapy is a treatment modality used to treat pain relief through the delivery of a low-level electrical current. The current is delivered to certain parts of your body in an attempt to relieve pain.</p>
<p>The frequency of the electrical impulses may vary depending on the type of device used and the treatment goals. The electrical waves produced by the microcurrent device are thought to stimulate energy production (ATP) which is necessary for cellular tissue repair and recovery.</p>
<p><strong>Microcurrent therapy is often used to:</strong></p>
<ol>
<li>Reduce/relieve pain</li>
<li>Stimulate tissue healing</li>
<li>Reduce inflammation and/or swelling</li>
</ol>
<p><strong>Microcurrent treatment may be helpful for:</strong></p>
<ul>
<li>Disc injuries</li>
<li>Fibromyalgia</li>
<li>Diabetic neuropathy</li>
<li>Neuromas (overgrowth and scarring to a nerve after an injury)</li>
<li>Tendinopathy (inflammation and/or swelling of the tendon)</li>
<li>Acute (sudden) and chronic (long-term) musculoskeletal injuries</li>
<li>Acute and chronic neuropathic (nerve) pain</li>
<li>Arthritis</li>
<li>Torticollis (the head is tilted to one side)</li>
<li>Disc injuries / discogenic and facet-based pain</li>
<li>Headaches</li>
<li>Plantar fasciitis (pain in the heel and foot)</li>
<li>Sports injuries</li>
<li>Wounds</li>
</ul>
<p>If you'd like more information about microcurrent treatment and how it may help you, please contact us (985) 641-5825.</p>`
  },
  {
    slug: 'moist-heat-ice',
    title: 'Moist Heat / Ice',
    metaDesc: 'Moist heat and cryotherapy in Slidell, LA. Therapeutic modalities to enhance your physical therapy treatment plan. Call 985-641-5825.',
    image: '/files/services/moist-heat-ice.jpg',
    content: `<h2>The Use Of Moist Heat and Cryotherapy During Your Physical Therapy Treatments</h2>
<p>Physical therapists often use treatment modalities (methods of treatment) like moist heat and cryotherapy. These modalities, especially when combined with other therapeutic interventions, can significantly enhance the effectiveness of treatment plans.</p>
<h3>Moist Heat Therapy: Gentle Warmth for Healing</h3>
<p><em>Physiological Benefits:</em></p>
<ul>
<li><strong>Improved Blood Flow:</strong> Moist heat expands blood vessels, increasing circulation to the affected area, which helps in the healing process.</li>
<li><strong>Muscle Relaxation:</strong> It is effective in easing muscle spasms and relaxing tight muscles, thus reducing discomfort.</li>
<li><strong>Increased Tissue Elasticity:</strong> Heat therapy makes tissues more flexible, aiding in exercises that improve range of motion.</li>
</ul>
<p>Moist heat therapy (hot packs) commonly are made of clay that is encased in canvas and soaked in a hot bath to heat them up. The hot packs are then wrapped in a towel or pad and applied to the affected area.</p>
<h3>Cryotherapy / Ice: A Cold Touch for Pain Relief</h3>
<p><em>Physiological Benefits:</em></p>
<ul>
<li><strong>Pain Relief:</strong> The primary benefit of cryotherapy is its ability to numb the treated area, offering immediate relief from acute pain.</li>
<li><strong>Reduced Nerve Activity:</strong> Cold therapy slows down nerve signal transmission, which can help in managing pain.</li>
<li><strong>Decreased Muscle Spasm:</strong> It can also help in reducing the frequency and intensity of muscle spasms.</li>
</ul>
<p>Cryotherapy or cold therapy commonly comes in the form of ice packs that are placed on the affected area for their desired therapeutic effects. An ice massage is another way to directly apply cold therapy to the area in need.</p>
<h3>FAQs</h3>
<ul>
<li><strong>When is moist heat therapy recommended?</strong> It's often suggested for chronic conditions like ongoing joint pain or muscle stiffness.</li>
<li><strong>How does cryotherapy help in pain relief?</strong> By numbing the affected area and slowing nerve signal transmission, cryotherapy can significantly reduce pain sensation.</li>
<li><strong>Can these therapies be combined?</strong> Yes, alternating between heat and cold therapy can be beneficial, depending on the specific condition and under professional guidance.</li>
<li><strong>What is the ideal duration for applying these therapies?</strong> Typically, 15-20 minutes is recommended, but it can vary based on individual needs and the therapist's advice.</li>
</ul>
<p>Your Physical Therapist Will Discuss The Use Of Moist Heat Or Ice/Cryotherapy And If They Should Be Part Of Your Treatment Plan.</p>
<p>By integrating moist heat and cryotherapy into your treatment (especially at home), you can leverage their benefits for effective pain management and recovery.</p>
<p>Contact Us Today To Learn More About Our Physical Therapy Services. You Can Call Us At (985) 641-5825</p>`
  },
  {
    slug: 'mulligan-technique',
    title: 'Mulligan Technique',
    metaDesc: 'Mulligan Technique physical therapy in Slidell, LA. Gentle, pain-free joint mobilizations to restore mobility and reduce pain. Call 985-641-5825.',
    image: '/files/services/mulligan-technique.jpg',
    content: `<p>Mulligan Techniques are a type of manual therapy intervention developed by Brian Mulligan, a renowned physiotherapist from New Zealand. These techniques focus on <em>Mobilization with Movement (MWM)</em>, where gentle, pain-free joint mobilizations are combined with active or functional movements.</p>
<p>The goal is to restore normal joint mechanics and reduce pain during movement. Mulligan Techniques are particularly effective in treating musculoskeletal conditions involving joints, soft tissues, and nerves. They are non-invasive and emphasize patient participation, making them a practical and efficient method for improving mobility and function.</p>
<p>Physical therapists play a critical role in implementing Mulligan Techniques to help patients manage pain and regain function. By carefully assessing a patient's movement restrictions or pain, a physical therapist applies precise, sustained mobilizations while the patient actively moves the joint in question. This approach can quickly improve range of motion, reduce discomfort, and enable patients to perform daily activities more comfortably.</p>
<p>Physical therapists also teach patients self-sustaining techniques and exercises that promote long-term recovery and independence, empowering them to maintain the progress made in therapy.</p>`
  },
  {
    slug: 'patient-education',
    title: 'Patient Education',
    metaDesc: 'Patient education physical therapy in Slidell, LA. Empowering you with knowledge for long-term health, wellness, and injury prevention. Call 985-641-5825.',
    image: '/files/services/patient-education.jpg',
    content: `<p>Physical therapy is not just about treating immediate injuries or ailments; it's about empowering patients with the knowledge and tools they need to lead healthier, more active lives. Patient education is a cornerstone of effective physical therapy, as it enables individuals to understand the root causes of their conditions, learn techniques for managing symptoms, and embrace preventive measures to avoid future injuries. Through personalized education plans, physical therapists can help patients develop a deeper awareness of their bodies, fostering a sense of ownership over their health journey.</p>
<p>At our practice, we believe that education is as essential as any therapeutic technique. Our team of experienced physical therapists is dedicated to equipping patients with the information they need to make informed decisions about their health. From explaining the biomechanics of movement to teaching proper posture and ergonomics, we strive to empower individuals to take an active role in their rehabilitation process. By fostering open communication and providing clear, accessible resources, we aim to create a collaborative environment where patients feel empowered to advocate for their own well-being both in and out of the clinic.</p>
<p>By integrating patient education into our comprehensive treatment approach, we not only address immediate concerns but also lay the foundation for long-term health and wellness. Whether you're recovering from an injury, managing a chronic condition, or seeking to optimize your physical performance, our team is here to support you every step of the way. Together, we can unlock your body's potential and empower you to live life to the fullest.</p>`
  },
  {
    slug: 'vasopneumatic-compression',
    title: 'Vasopneumatic Compression',
    metaDesc: 'Vasopneumatic compression therapy in Slidell, LA. Advanced treatment to improve circulation, reduce swelling, and accelerate healing. Call 985-641-5825.',
    image: '/files/services/vasopneumatic-compression.jpg',
    content: `<h2>What is Vasopneumatic Compression?</h2>
<p>Vasopneumatic compression is a cutting-edge treatment modality employed in physical therapy to accelerate the healing process. This technique utilizes inflatable garments, such as sleeves or boots, that are wrapped around the affected area. Controlled air pressure is then applied to facilitate improved blood circulation and lymphatic drainage. Some of these treatment devices also include a cryotherapy (ice) component along with compression for pain relief.</p>
<h2>Conditions Treated</h2>
<h3>Musculoskeletal Disorders</h3>
<ul>
<li>Sprains and Strains</li>
<li>Post-operative Edema</li>
<li>Arthritis</li>
</ul>
<h3>Vascular Conditions</h3>
<ul>
<li>Venous Insufficiency</li>
<li>Lymphedema</li>
</ul>
<h3>Sports Injuries</h3>
<ul>
<li>Shin Splints</li>
<li>Delayed Onset Muscle Soreness (DOMS)</li>
</ul>
<h3>How Does Vasopneumatic Compression Aid Treatment?</h3>
<ul>
<li><strong>Improved Blood Circulation:</strong> The rhythmic inflation and deflation of the garment promote better blood flow, aiding in delivering oxygen and nutrients to the affected area.</li>
<li><strong>Reduced Swelling:</strong> The compression helps to move excess fluid away from the injured site, thereby reducing edema and accelerating the healing process.</li>
<li><strong>Pain Relief:</strong> The treatment provides a massaging effect that can significantly alleviate pain and discomfort.</li>
</ul>
<h2>Frequently Asked Questions</h2>
<h3>Q: Is vasopneumatic compression safe?</h3>
<p>A: Yes, when administered by a qualified physical therapist, vasopneumatic compression is a safe and effective treatment option.</p>
<h3>Q: How long does a typical session last?</h3>
<p>A: A standard session usually lasts between 15 to 30 minutes, depending on the condition being treated.</p>
<h3>Q: Will my insurance cover this treatment?</h3>
<p>A: Coverage varies by insurance provider. It's advisable to consult with your insurance company for specific information.</p>
<h2>Take the Next Step in Your Recovery Journey</h2>
<p>If you're dealing with pain or musculoskeletal disorders, vasopneumatic compression might assist with your recovery.</p>
<p>Contact us today to schedule an appointment and experience the benefits of this advanced healing modality.</p>`
  }
];

// Build each page
services.forEach(svc => {
  const dir = path.join(baseDir, svc.slug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const html = pageHTML(svc);
  const filePath = path.join(dir, 'index.html');
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Created: ' + filePath);
});

console.log('\nDone! Generated ' + services.length + ' service pages.');