---
title: "Code Became a Material You Shape: The Real Story Behind Hakolah's Experiments"
icon: "🧪"
desc: "We read a popular idea going around — that code has become a shapeable material available to everyone, not just programmers. We actually tested it through Hakolah's Experiments section, and here's what we learned: speed wasn't the problem that got solved — judgment and testing are still entirely human work."
langSwitchUrl: "/guides/code-as-material.html"
aiDisclosure: "This article was written with AI assistance (Claude). Human input level: the site owner sent the AI a popular passage about the future of coding and AI, and asked for its opinion on it. He then asked to connect it to the site's actual experience with its Experiments section and turn it into an article. The AI wrote the piece drawing on real details from building the four experiments across earlier sessions."
---

## A Popular Idea, and a Practical Question

A certain idea keeps showing up in AI tool ads lately: code has become a "material" you shape the way you'd shape clay or pick a color — you no longer need to learn programming to make something that actually works. The question supposedly shifted from "can this be made?" to "what would you make if you could make anything?"

Catchy framing, but the practical question is: is this actually true in practice, or just marketing? We have a direct answer, because we actually tested it — Hakolah's entire "Experiments" section is built exactly this way.

## Four Experiments, Four Different Tests of the Idea

The Experiments section has four small tools, each built over one or more sessions with AI, without the site owner writing a single line of code himself:

- **Random music generator**: the first experiment — a simple question ("can an algorithm compose a piece that actually feels like real music?") turned into a tool that builds a new piece every time, with a coherent melody over a steady chord progression.
- **File converter**: a browser-based format conversion tool.
- **Income/expense calculator**: not a simple add-and-subtract calculator — it has real accounting concepts baked in (opening balance vs. period net, the 50/30/20 rule, profit and loss for a small business, recurring transactions).
- **Arabic typing speed test**: measures typing speed, using literary Arabic sentences that scale up in difficulty.

All four genuinely got built — that part of the idea holds. But "got built" isn't the same as "got built right the first time."

## Where the Real Difference Showed Up

The file converter specifically made the gap obvious: the tool worked technically from day one, but on mobile there was a visual bug — a small toast notification overlapped the file-picker button, and part of the content sat below the visible fold. A user would open the tool, feel like it wasn't working, even though it worked perfectly — they just couldn't reach the button.

That kind of bug never shows up until you actually test the tool on a real device — not from "confirming it works" by reading the code. The income/expense calculator hit the same pattern from a different angle: the first version was mathematically correct but missing real accounting concepts (the difference between an opening balance and a period's net change, for instance) — correct arithmetic, not actually useful for someone trying to understand their real financial position. The Arabic typing test needed more than one round of language review before its sentences were genuinely correct literary Arabic, not just "Arabic that looks right."

## The Takeaway: Speed Changed, Judgment Didn't

The part of the popular idea that holds up: yes, you can now build a tool that works in a single session, with no programming background. That's genuinely true and genuinely new.

The part it leaves out: building something that "works" is completely different from building something that "works correctly for a real user." That gap is exactly what needed real testing on an actual phone, a language review pass on test sentences, and a correction of accounting concepts — meaning judgment, taste, and patience with details, not just "what would you make."

Code really has become easier to shape than before. But deciding whether the final shape is actually good still takes a human who tests it, notices what's wrong, and fixes it.
