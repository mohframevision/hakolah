---
title: "Seven Habits for Using AI Like a Top CEO"
icon: "🧭"
desc: A read of a video on how the most productive people work with AI — seven simple habits in how you talk to it, with examples, ways to apply them, and illustrations.
langSwitchUrl: "/guides/ai-like-a-top-ceo.html"
aiDisclosure: "This article was written with AI assistance (Claude). Human input level: the site owner sent the video and asked for it to be turned into an article; the AI transcribed the video's audio automatically, then summarized and rewrote it, and designed its illustrations in code. The figures quoted are the video creator's claims and were not independently verified."
---

The creator of this video argues that the gap between the smartest people and everyone else in using AI isn't a better model or a different tool — it's almost entirely in **how they talk to it**. He lays out seven simple habits, which we summarize here in our own words, with examples of how to apply them.

> Source: the video "How to Use AI Like A Top 0.1% CEO" by creator Nick Saraev. This article is a summary and read in our own words, not a literal translation.

## 1. Talk, Don't Type

The average person types around 30–50 words per minute but speaks around 150–200. Not every spoken word will be perfect, but you still get far more across to the AI with your voice than with your fingers — so don't let your fingers be the bottleneck.

<figure class="viz">
<svg viewBox="0 0 560 120" role="img" aria-label="Typing speed compared with speaking speed">
<text class="viz-t viz-b" x="10" y="38">Typing</text>
<rect class="viz-muted" x="85" y="20" width="100" height="26" rx="6"/>
<text class="viz-t viz-s" x="195" y="38">30–50 words per minute</text>
<text class="viz-t viz-b" x="10" y="88">Speaking</text>
<rect class="viz-accent" x="85" y="70" width="400" height="26" rx="6"/>
<text class="viz-on" x="95" y="88">150–200 words per minute — 3–4× faster</text>
</svg>
<figcaption>Your voice is three to four times faster than your fingers.</figcaption>
</figure>

**How to apply it:** use any free voice dictation tool — ideally one you can train on your own words and terms so it gets more accurate. (We covered [Wispr Flow](/en/guides/wispr-flow.html) as one example in an earlier article.)

## 2. An Always-On Voice Assistant in Meetings

Picture an executive assistant who's always with you: listening to the meeting, taking notes, and turning what's said into tasks. Big companies use real-time transcription for exactly this, and the most extreme version is a system that picks up the to-dos mentioned in a meeting ("so-and-so needs to do this…") and starts doing them before the meeting is even over.

<figure class="viz">
<svg viewBox="0 0 560 110" role="img" aria-label="From meeting to execution: voice, then text, then tasks, then execution">
<defs><marker id="vz-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path class="viz-accent" d="M0,0 L8,4 L0,8 z"/></marker></defs>
<rect class="viz-card" x="10" y="25" width="120" height="56" rx="10"/><rect class="viz-card" x="150" y="25" width="120" height="56" rx="10"/><rect class="viz-card" x="290" y="25" width="120" height="56" rx="10"/><rect class="viz-card viz-card-on" x="430" y="25" width="120" height="56" rx="10"/>
<text class="viz-t" x="70" y="50" text-anchor="middle">🎙️ Meeting</text><text class="viz-t viz-s" x="70" y="68" text-anchor="middle">voice + screen</text>
<text class="viz-t" x="210" y="50" text-anchor="middle">📝 Live transcript</text><text class="viz-t viz-s" x="210" y="68" text-anchor="middle">full text</text>
<text class="viz-t" x="350" y="50" text-anchor="middle">✅ Tasks</text><text class="viz-t viz-s" x="350" y="68" text-anchor="middle">who does what</text>
<text class="viz-t" x="490" y="50" text-anchor="middle">⚙️ Execution</text><text class="viz-t viz-s" x="490" y="68" text-anchor="middle">during the meeting</text>
<g class="viz-line" marker-end="url(#vz-arrow)"><line x1="132" y1="53" x2="146" y2="53"/><line x1="272" y1="53" x2="286" y2="53"/><line x1="412" y1="53" x2="426" y2="53"/></g>
</svg>
<figcaption>From talking to done, without anyone typing a line.</figcaption>
</figure>

**How to apply it:** ask the strongest model you have to build a tool that listens to your mic and system audio, transcribes the whole meeting, and then creates tasks in the systems you use every day. The video's creator says running something like this can cost as little as a dollar or two a day.

## 3. Show, Don't Tell

A picture is worth a thousand words, and a video is 24 or more pictures every second. So the best users ask the AI itself to make visuals that explain the idea: interactive charts, 3D models, or an explainer video.

**Example:** if you're moving into a new office, don't stop at the floor plan — ask for a 3D model with realistic lighting that you can walk around in, then furnish it with real products to try before you buy. The same goes for turning dense reports into clear visuals. (The illustrations in this very article were made in code this way.)

## 4. Have the AI Interview You

It isn't enough to tell it what you want — often the bottleneck is your own lack of knowledge, or how hard it is to put exactly what you want into words. Relying only on what you know is like trying to pipe an entire ocean through the straw of your personal experience.

<figure class="viz">
<svg viewBox="0 0 560 120" role="img" aria-label="The ocean: everything the model knows; the straw: your experience alone">
<path class="viz-water" d="M15,10 C90,10 130,40 200,55 L200,65 C130,80 90,110 15,110 Z"/>
<rect class="viz-water" x="200" y="55" width="320" height="10" rx="5"/>
<text class="viz-t" x="100" y="64" text-anchor="middle">The ocean: all it knows</text>
<text class="viz-t viz-s" x="360" y="90" text-anchor="middle">The straw: your experience alone</text>
</svg>
<figcaption>Let it ask you, and it reaches what you didn't know you needed.</figcaption>
</figure>

**Tell it:** "I want to get X done. Ask me anything you might need to know to suggest the best way of doing it."

## 5. Ask for Flaws, Not Opinions

Models are trained with reinforcement learning from human feedback (RLHF), so they're sometimes rewarded more for agreeing with you than for being right. Ask for their opinion and they'll usually lean toward praise — even when you're wrong.

<figure class="viz viz-compare">
<div class="viz-no"><b>✗ Instead of:</b> "What do you think of this?" · "Is this email okay?" · "What do you think of my project?"</div>
<div class="viz-yes"><b>✓ Ask:</b> "What's wrong with my idea?" · "Poke holes in my thinking." · "Roast my essay."</div>
</figure>

Once you've heard the criticism, you're the judge of whether the bad outweighs the good.

## 6. Try It Yourself

If you doubt a model can do something, ask it to do it instead of asking people. Tools change so fast that, according to the video, a score on a benchmark once seen as near-impossible can climb past half within a single month.

<figure class="viz">
<svg viewBox="0 0 560 150" role="img" aria-label="A curve rising from near zero to 53% in 30 days">
<line class="viz-axis" x1="40" y1="120" x2="530" y2="120"/><line class="viz-axis" x1="40" y1="120" x2="40" y2="15"/>
<polyline class="viz-curve" points="40,118 90,116 140,112 190,108 240,100 290,92 340,82 390,72 440,62 490,56 520,52"/>
<circle class="viz-accent" cx="520" cy="52" r="6"/>
<text class="viz-t viz-b viz-hi" x="515" y="38" text-anchor="middle">53%</text>
<text class="viz-t viz-s" x="285" y="142" text-anchor="middle">A hard benchmark over 30 days</text>
</svg>
<figcaption>What's true today may not be true tomorrow — the only way to know is to try.</figcaption>
</figure>

The video notes that Nvidia's CEO doesn't just listen to what others tell him; he runs AI coding tools on his own computer and tries them himself — because the best answer to "is this possible?" is to try it at least once.

## 7. Keep an Open Mind

AI tools will take many forms: digital avatars that chat with you like a coworker, small wearable devices, ways of working we aren't used to yet. Try them — you'll either succeed or fail, and both are fine, because you explored the opportunity. The cost of not trying is very high these days.

<figure class="viz">
<svg viewBox="0 0 560 130" role="img" aria-label="A scale: not trying weighs more than trying">
<line class="viz-axis viz-thick" x1="280" y1="40" x2="280" y2="115"/><line class="viz-axis viz-thick" x1="230" y1="115" x2="330" y2="115"/>
<line class="viz-beam" x1="120" y1="25" x2="440" y2="60"/><circle class="viz-ink" cx="280" cy="42" r="5"/>
<rect class="viz-ink" x="385" y="65" width="110" height="38" rx="6"/><text class="viz-inv" x="440" y="89" text-anchor="middle">Not trying</text>
<rect class="viz-card viz-card-on" x="70" y="0" width="100" height="22" rx="6"/><text class="viz-t viz-hi" x="120" y="16" text-anchor="middle">Trying</text>
</svg>
<figcaption>"Not trying" is the heavier cost.</figcaption>
</figure>

## Summary

- **Talk, don't type:** your voice is faster than your fingers.
- **Always-on meeting assistant:** live transcript, then tasks, then execution.
- **Show, don't tell:** ask for visuals instead of descriptions.
- **Let it interview you:** "Ask me anything you need to know before you start."
- **Ask for flaws:** "What's wrong with this?" instead of "What do you think?"
- **Try it yourself:** the fastest answer to "is this possible?" is to try.
- **Keep an open mind:** the cost of not trying is higher than the cost of failing.

And the rule that ties them together: the difference isn't the tool, it's how you talk to it.
