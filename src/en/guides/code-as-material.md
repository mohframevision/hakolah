---
title: "Code Became a Material You Shape: The Real Story Behind Hakolah's Experiments"
icon: "🧪"
desc: "A popular idea says code has become a material anyone can shape, programmers or not. We tested it in Hakolah's Experiments section. Writing code got faster, but judgment and testing were still entirely our job."
langSwitchUrl: "/guides/code-as-material.html"
aiDisclosure: "This article was written with AI assistance (Claude). Human input level: the site owner sent the AI a popular passage about the future of coding and AI, and asked for its opinion on it. He then asked to connect it to the site's actual experience with its Experiments section and turn it into an article. The AI wrote the piece drawing on real details from building the four experiments across earlier sessions."
image: /assets/guides/code-as-material.jpg
imageCredit: "AI illustration · Hakolah"
---

## A Popular Idea, and a Practical Question

AI tool ads keep repeating one idea: code has become a "material" you shape the way you'd shape clay or pick a color, so you no longer need to learn programming to make something that works. The question, they say, has moved from "can this be made?" to "what would you make if you could make anything?"

Is that true, or is it marketing? We can answer from experience, because Hakolah's whole "Experiments" section was built this way.

## Four Experiments, Four Different Tests of the Idea

The Experiments section has four small tools, each built over one or more sessions with AI, without the site owner writing a single line of code himself:

- **Random music generator**: the first experiment. It started from a simple question ("can an algorithm compose a piece that feels like real music?") and became a tool that builds a new piece every time, with a coherent melody over a steady chord progression.
- **File converter**: a browser-based format conversion tool.
- **Income/expense calculator**: it goes past adding and subtracting, with real accounting concepts built in (opening balance vs. period net, the 50/30/20 rule, profit and loss for a small business, recurring transactions).
- **Arabic typing speed test**: measures typing speed, using literary Arabic sentences that scale up in difficulty.

All four got built, so that part of the idea holds. None of them was right the first time, though.

## Where the Real Difference Showed Up

The file converter showed the gap most clearly. It worked from day one, but on phones a small toast notification covered the file-picker button, and part of the page sat below the fold. Someone opening it would think it was broken when they simply couldn't reach the button.

You only find that kind of bug by testing on a real device; reading the code won't show it. The income/expense calculator had a similar problem: the first version did the arithmetic correctly but lacked basic accounting ideas, such as the difference between an opening balance and a period's net change, so it couldn't tell someone where they actually stood. The Arabic typing test needed more than one round of language review before its sentences were correct literary Arabic.

## The Takeaway: Speed Changed, Judgment Didn't

One part of the idea holds up: you can now build a working tool in a single session with no programming background. That is new.

What the idea leaves out is the distance between a tool that runs and a tool that works for a real user. Closing it took testing on an actual phone, a language review of the test sentences, and fixing the accounting concepts, which all came down to judgment and patience with details.

Code is easier to shape than it used to be. Deciding whether the result is any good still takes a person who tests it, notices what's wrong and fixes it.
