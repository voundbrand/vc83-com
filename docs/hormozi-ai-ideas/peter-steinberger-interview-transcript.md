https://www.youtube.com/watch?v=YFjfBk8HI5o

- I watched my agent happily click the "I'm not a robot" button. I made the agent very aware. Like, it knows what his source code is. It
0:077 secondsunderstands th- how it sits and runs in its own harness. It knows where documentation is. It knows which
0:1515 secondsmodel it runs. It understands its own system that made it very easy for an agent to... Oh, you don't like anything? You just prompted it to
0:2222 secondsexistence, and then the agent would just modify its own software. People talk about self-modifying software, I just built it. I actually think wipe coding is a slur.
0:3131 seconds- You prefer agentic engineering?
0:3333 seconds- Yeah, I always tell people I'd- I do agentic engineering, and then maybe after 3:00 AM, I switch to wipe coding, and then I have regrets on the next day.
0:4040 seconds- What a walk of shame. - Yeah, you just have to clean up and, like, fix your sh- shit. - We've all been there.
0:4646 seconds- I used to write really long prompts. And by writing, I mean, I don't write, I- I- I talk, you know? These- these hands are,
0:5454 secondslike, too- too precious for writing now. I just- I just use bespoke prompts to build my software.
1:001 minute- So, you, for real, with all those terminals, are using voice? - Yeah. I used to do it very extensively,
1:081 minute, 8 secondsto the point where there was a period where I lost my voice.
1:131 minute, 13 seconds- I mean, I have to ask you, just curious. I- I know you've probably gotten huge offers from major companies.
1:211 minute, 21 secondsCan you speak to who you're considering working with? - Yeah.
Chapter 2: Introduction
1:301 minute, 30 seconds- The following is a conversation with Peter Steinberger, creator of OpenClaw, formerly known as MoldBot,
1:381 minute, 38 secondsClawedBot, Clawdus, Claude, spelled with a W as in lobster claw. Not to be confused with Claud, the AI model from
1:451 minute, 45 secondsAnthropic, spelled with a U. In fact, this confusion is the reason Anthropic kindly asked Peter to
1:521 minute, 52 secondschange the name to OpenClaw. So, what is OpenClaw? It's an open-source AI agent that has taken over the
2:002 minutestech world in a matter of days, exploding in popularity, reaching over 180,000 stars on GitHub, and spawning the social
2:102 minutes, 10 secondsnetwork mold book, where AI agents post manifestos and debate consciousness, creating a mix of excitement and fear in the
2:182 minutes, 18 secondsgeneral public. And a kind of AI psychosis, a mix of clickbait fearmongering and genuine, fully justifiable concern about the role of AI in our digital,
2:292 minutes, 29 secondsinterconnected human world. OpenClaw, as its tagline states, is the AI that actually does things. It's an
2:362 minutes, 36 secondsautonomous AI assistant that lives in your computer, has access to all of your stuff, if you let it, talks to you through Telegram,
2:442 minutes, 44 secondsWhatsApp, Signal, iMessage, and whatever else messaging client. Uses whatever AI model you like, including Claude Opus 4.6 and GPT 5.3 Codex,
2:562 minutes, 56 secondsall to do stuff for you. Many people are calling this one of the biggest moments in the recent history of AI, since the launch of
3:043 minutes, 4 secondsChatGPT in November 2022. The ingredients for this kind of AI agent were all there, but putting it all together in a
3:123 minutes, 12 secondssystem that definitively takes a step forward over the line from language to agency, from ideas to actions, in a way that
3:193 minutes, 19 secondscreated a useful assistant that feels like one who gets you and learns from you, in an open source, community-driven way, is the reason OpenClaw took the internet by storm.
3:323 minutes, 32 secondsIts power, in large part, comes from the fact that you can give it access to all of your stuff and give it permission to do anything with that stuff in
3:403 minutes, 40 secondsorder to be useful to you. This is very powerful, but it is also dangerous. OpenClaw
3:473 minutes, 47 secondsrepresents freedom, but with freedom comes responsibility. With it, you can own and have control
3:543 minutes, 54 secondsover your data, but precisely because you have this control, you also have the responsibility to protect it from cybersecurity
4:014 minutes, 1 secondthreats of various kinds. There are great ways to protect yourself, but the threats and vulnerabilities are out there.
4:094 minutes, 9 secondsAgain, a powerful AI agent with system- level access is a security minefield, but it also represents the future. Because
4:164 minutes, 16 secondswhen done well and securely, it can be extremely useful to each of us humans as a personal assistant. We discuss all of this with Peter, and
4:264 minutes, 26 secondsalso discuss his big-picture programming and entrepreneurship life story, which I think is truly inspiring. He spent 13 years building PSPDF
4:364 minutes, 36 secondsKit, which is a software used on a billion devices. He sold it, and for a brief time,
4:434 minutes, 43 secondsfell out of love with programming, vanished for three years, and then came back, rediscovered his love for programming, and built,
4:514 minutes, 51 secondsin a very short time, an open source AI agent that took the internet by storm. He is, in many ways, the symbol
4:594 minutes, 59 secondsof the AI revolution happening in the programming world. There was the ChatGPT moment in 2022, the DeepSeek moment in 2025, and now, in '26, we're living through the OpenClaw moment, the age of the lobster.
5:165 minutes, 16 secondsThe start of the agentic AI revolution. What a time to be alive. This is a Lex Fridman podcast. To support it, please
5:235 minutes, 23 secondscheck out our sponsors in the description, or you can also find links to contact me, ask questions, give feedback, and so on.
5:315 minutes, 31 secondsAnd now, dear friends, here's Peter Steinberger. The one and only, the Clawed Father. Actually,
Chapter 3: OpenClaw origin story
5:405 minutes, 40 secondsBenjamin predicted it in his tweet. "The following is a conversation with Claude, a respected crustacean." It's a
5:475 minutes, 47 secondshilarious-looking picture of a lobster in a suit, so I think the prophecy has been fulfilled. Let's
5:545 minutes, 54 secondsgo to this moment when you built a prototype in one hour, that was the early version of OpenClaw. I think this,
6:026 minutes, 2 secondsStory's really inspiring to a lot of people because this prototype led to something that just took the internet by storm....
6:106 minutes, 10 secondsand became the fastest-growing repository in GitHub history, with now over 175,000 stars. So, what was the story of the one-hour prototype?
6:206 minutes, 20 seconds- You know, I wanted that since April. - A personal assistant. AI personal assistant.
6:256 minutes, 25 seconds- Yeah. And I, I played around with some other things, like even stuff that gets all my WhatsApp, and I could just run queries
6:356 minutes, 35 secondson it. That was back when we had GPT-4.1, with the one million context
6:416 minutes, 41 secondswindow. And I, I pulled in all the data and then just asked him questions like, "What makes this friendship meaningful?"
6:506 minutes, 50 seconds- Mm-hmm.
6:506 minutes, 50 seconds- And I got some, some really profound results. Like, I sent it to my friends and they got, like, teary eyes.
6:596 minutes, 59 seconds- So, there's something there. - Yeah. But then I... I thought all the labs will, will,
7:057 minutes, 5 secondswill work on that. So I, I moved on to other things, and that was still very much in my early days of experimenting and pl- playing. You know, you have to...
7:167 minutes, 16 secondsThat's how you learn. You just like, you do stuff and you play. And time flew by and it was November. I wanted to make sure that
7:267 minutes, 26 secondsthe thing I started is actually happening. I was annoyed that it didn't exist, so I just prompted it into existence.
7:367 minutes, 36 seconds- I mean, that's the beginning of the hero's journey of the entrepreneur,
7:397 minutes, 39 secondsright? And you've even with your original story with PS PDF kit, it's like, "Why does this not exist? Let me build it." And again, here's diff- a whole different realm, but similar maybe spirit.
7:527 minutes, 52 seconds- Yeah, so I had this problem. I tried to show PDF on an iPad, which should not be hard. - This is like 15 years ago, something like that.
7:597 minutes, 59 seconds- Yeah. Like the most, the most random thing ever. And suddenly, I had this problem and I, I wanted to help a friend. And there was, there was... Well, not like nothing existed, but it was just not good.
8:118 minutes, 11 secondsAnd like... Like I tried it and it was like very, "Nah." Like, "Hmm, I can do this better."
8:178 minutes, 17 seconds- By the way, for people who don't know, this led to the development of PS PDF kit that's used on a billion devices. So, the... It turns out that it's pretty useful to be able to open a PDF.
8:288 minutes, 28 seconds- You could also make the joke that I'm really bad at naming. - Yeah.
8:328 minutes, 32 seconds- Like, name number five on the current project. And even PS PDF doesn't really roll from the tongue.
8:398 minutes, 39 seconds- Anyway, so you said "Screw it. Why don't I do it?" So what was the... What was the prototype? What was the thing that you... What was the magical thing that you built in a short amount of time that you were like,
8:518 minutes, 51 seconds"This might actually work as an agent," where I talk to it and it does things?
Chapter 4: Mind-blowing moment
8:558 minutes, 55 seconds- There was... Like, one of my projects before already did something where I could bring my terminals onto the web and then I could, like, interact with them, but there also would be terminals on my Mac.
9:069 minutes, 6 seconds- Mm-hmm.
9:079 minutes, 7 seconds- Viptunnel, which was like a, a weekend hack project that was still very early. And it was cloud code
9:169 minutes, 16 secondstimes. You know, you got a dopamine hit when you got something right. And now I get, like, mad when you get something wrong.
9:229 minutes, 22 seconds- And you had a really great -– not to take a tangent -– but a great blog post describing that you converted Viptunnel. You vibe-coded
9:309 minutes, 30 secondsViptunnel from TypeScript into Zig of all programming languages with a single prompt. One prompt, one shot. Convert the entire code base into Zig.
9:419 minutes, 41 seconds- Yeah. There was this one thing where part of the architecture was... Took too much memory. Every terminal
9:519 minutes, 51 secondsused like a node. And I wanted to change it to Rust and... I mean, I can do it. I can, I can manually
10:0010 minutesfigure it all out, but all my automated attempts failed miserably.
10:0810 minutes, 8 secondsAnd then I revisited about four or five months later. And I'm like, "Okay, now let's use something even more experimental." And
10:1610 minutes, 16 secondsI, and I just typed, "Convert this and this part to Sig," and then let Codex run off. And it basically got it right. There was one little detail that I had to,
10:2710 minutes, 27 secondslike, modify afterwards, but it just ran for overnight or like six hours and just did its thing. And it's like... It's just mind-blowing.
10:3910 minutes, 39 seconds- So that's on the LLM programming side, refactoring. But uh, back to the
10:4610 minutes, 46 secondsactual story of the of the prototype. So how did Viptunnel connect to the first prototype where your, like, agents can actually work?
10:5210 minutes, 52 seconds- Well, that was still very limited. You know, like I had this one experiment with WhatsApp, then I had this experiment, and both felt like
11:0111 minutes, 1 secondnot the right answer. And then my search bar was literally just hooking up WhatsApp to
11:1011 minutes, 10 secondscloud code. One shot. The CLI message comes in. I call the CLI with -p. It does its
11:1711 minutes, 17 secondsmagic, I get the string back and I send it back to WhatsApp. And I, I built this in one hour. And
11:2411 minutes, 24 secondsI felt... Already felt really cool. It's like, "Oh, I could... I can, like, talk to my computer," right? This... That, that was, that was cool. But
11:3211 minutes, 32 secondsI, I wanted images, 'cause I alw- I often use images when I prompt. I think it's such a, such an efficient way to give the agent more
11:3911 minutes, 39 secondscontext. And they are really good at figuring out what I mean, e- even if it's like a, a weird cropped-up screenshot. So I used it a lot and I wanted to do
11:4711 minutes, 47 secondsthat in WhatsApp as well. Also, like, you know, just you run around, you see like a poster of an event, you just make a screenshot and like figure out if I have time there, if this is good, if my friends are maybe up for that.
12:0012 minutesJust like images seemed im- important. So I, I worked a few... It took me a few more hours to actually get that right. Um,
12:0912 minutes, 9 secondsand then it was just...... I, I used it a lot. And funny enough, that was
12:1712 minutes, 17 secondsjust before I went on a trip to Marrakesh with my friends for a birthday trip. And there it was even better because
12:2612 minutes, 26 secondsinternet was a little shaky but WhatsApp just works, you know? It's like doesn't matter, you have, like, edge, it still works. WhatsApp is
12:3312 minutes, 33 secondsjust... It's just made really well. So I ended up using it a lot. Um,
12:4112 minutes, 41 secondstranslate this for me, explain this, find me places. Like, you just having a clanker doing, having Google for
12:4812 minutes, 48 secondsyou, that was... Basically there was still nothing built but it still could do so much. - So, if we talk about the full journey that's happening there with the agent,
12:5812 minutes, 58 secondsyou're just sending on this very thin line WhatsApp message via CLI, it's going to a cloud code and cloud code is doing all kinds of
13:0813 minutes, 8 secondsheavy work and coming back to you with a thin message.
13:1313 minutes, 13 seconds- Yeah. It was slow because every time I boot up the CLI, but it... It was really cool already. And it could just use all the things that I already had
13:2313 minutes, 23 secondsbuilt. I had built like a whole bunch of CLI stuff over the month so it, it felt really powerful.
13:3113 minutes, 31 seconds- There is something magical about that experience that's hard to put into words. Being able to use a chat client
13:4013 minutes, 40 secondsto talk to an agent, versus, like, sitting behind a computer and like, I don't know, using
13:4713 minutes, 47 secondscursor or even using Cloud Code CLI in the terminal. It's a different experience than being able to sit back and talk to it. I mean, it seems like a trivial step
13:5513 minutes, 55 secondsbut, it- in some sense it's a... It's like a phase shift in the integration of AI into your life and how it feels, right?
14:0514 minutes, 5 seconds- Yeah. Yeah. I, I read this tweet this morning where someone said, "Oh, there's no magic in it. It's just like,
14:1214 minutes, 12 secondsit does this and this and this and this and this and this." And it almost feels like a hobby, just as cursor or perplexity. And I'm
14:2014 minutes, 20 secondslike, well, if that's a hobby that's kind of a compliment, you know? They're like, they're not doing too bad. Thank you I guess?
14:3214 minutes, 32 secondsYes. I mean, isn't, isn't, isn't magic often just like you take a lot of things that are already there
14:3914 minutes, 39 secondsbut bring them together in new ways? Like, I don't... There's no... Yeah. Maybe there's no magic in there but sometimes just rearranging things and, like, adding a few new ideas is all the magic that you need.
14:5114 minutes, 51 seconds- It's really hard to convert into words what is, what is magic about a thing. If you look at the, the scrolling on an
14:5814 minutes, 58 secondsiPhone, why is that so pleasant? There's a lot of elements about that interface that makes it incredibly pleasant, that is fundamental to the experience of
15:0615 minutes, 6 secondsusing a smartphone, and it's like, okay, all the components were there. Scrolling was there, everything was there. - Nobody did it-
15:1415 minutes, 14 seconds- Yep - ... and afterwards it felt so obvious. - Yeah, so obvious.
15:1615 minutes, 16 seconds- Right? But still... You know the moment where it, it blew my mind was when,
15:2515 minutes, 25 secondswhen I- I used it a lot and then at some point I just sent it a message and, and then a typing indicator appeared. And I'm like, wait, I
15:3515 minutes, 35 secondsdidn't build that, it only m- it only has image support, so what is it even doing? And then it would just reply. - What was the thing you sent it?
15:4315 minutes, 43 seconds- Oh, just a random question like, "Hey, what about this in this restaurant?" You know? Because we were just running around and checking out the city.
15:5215 minutes, 52 secondsSo that's why I, I didn't, didn't even think when I used it because sometimes when you're in a hurry typing is annoying. - So, oh, you did an audio message?
16:0016 minutes- Yeah. And it just, it just worked and I'm like... - And it's not supposed to work because-
16:0516 minutes, 5 seconds- No - ... you didn't give it that-
16:0716 minutes, 7 seconds- No, literally - ... capability. - I literally went, "How the fuck did he do that?" And it was like, "Yeah,
16:1216 minutes, 12 secondsthe mad lad did the following. He sent me a message but it only, only was a file and no file ending." So I checked out the header of the file and it found that it was,
16:2316 minutes, 23 secondslike, opus so I used ffmpeg to convert it and then I wanted to use whisper but it didn't had it installed. But then I found the
16:3016 minutes, 30 secondsOpenAI key and just used Curl to send the file to OpenAI to translate and here I am.
16:3916 minutes, 39 secondsJust looked at the message I'm like, "Oh wow." - You didn't teach it any of those things and the agent just figured it out, did all those conversions,
16:4716 minutes, 47 secondsthe translations. It figured out the API, it figured out which program to use, all those kinds of things. And you were just absent-mindedly just sent an audio message when it came back.
16:5616 minutes, 56 seconds- Yeah, like, so clever even because he would have gotten the whisper local path, he would have had to download a model. It would have been too slow. So like, there's so much world
17:0417 minutes, 4 secondsknowledge in there, so much creative problem solving. A lot of it I think mapped from... If you get really good at coding that means you have to
17:1217 minutes, 12 secondsbe really good at general purpose problem solving. So that's a skill, right? And that just maps into other domains. So it had the problem of
17:2017 minutes, 20 secondslike, what is this file with no file ending? Let's figure it out. And that's when it kind of clicked for me. It's like, I was like very
17:2917 minutes, 29 secondsimpressed. And somebody sent a pull request for Discord support and I'm like, "This is a WhatsApp relay.
17:3717 minutes, 37 secondsThat doesn't, doesn't fit at all." - At that time it was called WA Relay.
17:4217 minutes, 42 seconds- Yeah. And so I debated with me like, do I want that? Do I not want that? And then
17:5117 minutes, 51 secondsI thought, well maybe, maybe I do that because that could be a cool way to show people. Because I... So far I did it in WhatsApp
18:0018 minutesas like groups you know but don't really want to give my phone number to every internet stranger. - Yeah.
18:0718 minutes, 7 seconds- Um, journalists manage to do that anyhow now so that's a different story. So I merged it-... from Shadow,
18:1818 minutes, 18 secondswho helped me a lot with the whole project. So, thank you. And, and I put my, my bot in there.
Chapter 5: Why OpenClaw went viral
18:2718 minutes, 27 seconds- On Discord?
18:2818 minutes, 28 seconds- Yeah. No security because I didn't... I hadn't built sandboxing in yet. I, I just prompted it to, like, only listen to me.
18:3818 minutes, 38 secondsAnd then some people came and tried to hack it, and I just... Or, like, just watched and I just kept working in the open, you
18:4518 minutes, 45 secondsknow? Like, y- I used my agent to build my agent harness
18:5318 minutes, 53 secondsand to test, like, various stuff. And that's very quickly when it clicked for people. So it's almost like it needs to
19:0119 minutes, 1 secondbe experienced. And from that time on, that was January the 1st, I, I got
19:0919 minutes, 9 secondsmy first real influencer being a fan and did videos, dachitze. Thank you. And, and from there on, I saw, I started gaining up speed. And at the same time, my,
19:2319 minutes, 23 secondsmy sleep cycle went shorter and shorter because I, I felt the storm
19:2919 minutes, 29 secondscoming, and I just worked my ass off to get it to... into a state where it's kinda good.
19:3819 minutes, 38 seconds- There's a few components and we'll talk about how it all works, but basically, you're able to talk to it using WhatsApp, Telegram,
19:4519 minutes, 45 secondsDiscord. So that's a component that you have to get right. - Yeah.
19:4919 minutes, 49 seconds- And then you have to figure out the agentic loop, you have to have the gateway, you have the harness, you have all those components that make it all just work nicely.
19:5619 minutes, 56 seconds- Yeah. It felt like Factorio times infinite. - Right.
20:0120 minutes, 1 second- I, I feel like I built my little- ... my little playground. Like, I never had so much fun than building this project. You know?
20:0820 minutes, 8 secondsLike, you have like, "Oh," I go like, level one agentic loop. What can I do there?
20:1220 minutes, 12 secondsHow can I be smart at queuing messages? How can I make it more human-like? Oh, then I had this idea of... Because the loop
20:1920 minutes, 19 secondsalways... The agent always replies something, but you don't always want an agent to reply something in a group chat. So I gave him this no-reply token. So I gave him an option to shut up. So it, it feels more natural.
20:3220 minutes, 32 seconds- That's level two. - Y- uh, yeah, yeah. Yeah, on the- on the- - Factorio. - On the agentic loop. And then I go to memory, right? - Yeah.
20:3920 minutes, 39 seconds- You want him to, like, remember stuff. So maybe, maybe the end... The ultimate boss is continuous reinforcement learning,
20:4620 minutes, 46 secondsbut I'm, I'm, like, at... I feel like I'm level two or three with Markdown files and the vector database. And then you, you can go to level
20:5420 minutes, 54 secondscommunity management, you can go to level website and marketing. There's just so many hats that you have to have on. Uh,
21:0121 minutes, 1 secondnot even talking about native apps. That's just, like, infinite different levels and infinite level ups you can do.
21:0821 minutes, 8 seconds- So the whole time you're having fun. We should say that for the most part, throughout this whole process, you're a one-man team. There's people helping, but you're doing so much of the key core development.
21:2121 minutes, 21 seconds- Yeah. - And having fun? You did, in January, 6,600 commits. Probably more.
21:2821 minutes, 28 seconds- I sometimes posted a meme. I'm limited by the technology of my time. I could do more if agents would be faster. - But we should say you're running multiple agents at the same time.
21:3721 minutes, 37 seconds- Yeah. Depending on how much I slept and how difficult of the tasks I work on, between four and 10.
21:4521 minutes, 45 seconds- Four and 10 agents. Uh there's so many possible directions, speaking of Factorio, that we can go here. But one big picture one is, why do you think
21:5621 minutes, 56 secondsyour work, Open Claw, won? In this world, if you look at 2025, so many
22:0522 minutes, 5 secondsstartups, so many companies were doing kind of agentic type stuff, or claiming to. And here, Open Claw comes in and destroys everybody. Like, why did you win?
22:1522 minutes, 15 seconds- Because they all take themselves too serious. - Yeah. - Like, it's hard to compete against someone who's just there to have fun.
Chapter 6: Self-modifying AI agent
22:2422 minutes, 24 seconds- Yeah. - I wanted it to be fun, I wanted it to be weird. And if you see, like,
22:2822 minutes, 28 secondsall the, all the lobster stuff online I think I, I managed weird. I... You
22:3622 minutes, 36 secondsknow, for the longest time, the only, the only way to install it was git clone, pnpm build, pnpm gateway.
22:4622 minutes, 46 secondsLike, you clone it, you build it, you run it. And then the, the agent... I made the agent very aware. Like, it
22:5322 minutes, 53 secondsknows that it is... What its source code is. It understands th- how it sits and runs in its own
23:0123 minutes, 1 secondharness. It knows where documentation is. It knows which model it runs. It knows if you turn on the voice or, or reasoning mode. Like,
23:1123 minutes, 11 secondsI, I wanted to be more human-like, so it understands its own system that made it very easy for an agent to...
23:1823 minutes, 18 secondsOh, you don't like anything? You just prompted it to existence, and then the agent would just modify its own software. Um,
23:2623 minutes, 26 secondsyou know, we have people talk about self- modifying software. I just built it and didn't even... I didn't even plan it so much. It just happened.
23:3523 minutes, 35 seconds- Can you actually speak to that? 'Cause it's just fascinating. So you have this piece of software that's written in TypeScript-
23:4323 minutes, 43 seconds- Yeah - ... that's able to, via the agentic loop, modify itself. I mean, what a moment to be alive in
23:5123 minutes, 51 secondsthe history of humanity and the history of programming. Here's the thing that's used by a huge amount of people to do
23:5923 minutes, 59 secondsincredibly powerful things in their lives, and that very system can rewrite itself, can modify
24:0624 minutes, 6 secondsitself. Can you just, like, speak to the power of that? Like, isn't that incredible? Like, when did you first close the loop on that?
24:1424 minutes, 14 seconds- Oh, because that's how I built it as well, you know? Most of it is built by Codex, but oftentimes I... When I debug it, I...... I use self-introspection so much.
24:2624 minutes, 26 secondsIt's like, "Hey, what tools do you see? Can you call the tool yourself?" Or like, "What error do you see? Read the source code. Figure out what's the problem."
24:3224 minutes, 32 secondsLike, I just found it an incredibly fun way to... That the agent, the very agent and software that you
24:4024 minutes, 40 secondsuse is used to debug itself, so that it felt just natural that everybody does that. And that it led to so many,
24:5024 minutes, 50 secondsso many pull requests by people who never wrote software. I mean, it also did show that people never wrote software . So I call them prompt requests
24:5824 minutes, 58 secondsin the end. But I don't want to, like, pull that down because every time someone made the first pull request is a
25:0625 minutes, 6 secondswin for our society, you know? Like, it... Like, it doesn't matter how, how shitty it is, y- you gotta start somewhere.
25:1325 minutes, 13 secondsSo I know there's, like, this whole big movement of people complain about open source and the quality of PRs, and a whole different level of
25:2125 minutes, 21 secondsproblems. But on a different level, I found it... I found it
25:2825 minutes, 28 secondsvery meaningful that, that I built something that people love to think of so much that they actually start to learn how open source works.
25:3725 minutes, 37 seconds- Yeah, you were ... The Open Cloud project was the first pull request. You were the first for so many. That is
25:4425 minutes, 44 secondsmagical. So many people that don't know how to program are taking their first step into the programming world with this.
25:5225 minutes, 52 seconds- Isn't that a step up for humanity? Isn't that cool? - Creating builders.
25:5625 minutes, 56 seconds- Yeah. Like, the bar to do that was so high, and, like, with agents, and with the right software, it just, like, went lower and lower.
26:0426 minutes, 4 secondsI don't know. I was at a... And I also organize another type of meetup. I call it... I called it Cloud Code Anonymous.
26:1426 minutes, 14 secondsUh, you can get the inspiration from. Now, I call it Agents Anonymous- ... for, for reasons.
26:2326 minutes, 23 seconds- Agents Anonymous. - And- - Oh, it's so funny on so many levels. I'm sorry, go ahead.
26:2926 minutes, 29 seconds- Yeah. And there was this one guy who, who talked to me. He's like, "I run this design agency, and we, we never had custom software. And
26:3726 minutes, 37 secondsnow I have, like, 25 little web services for various things that help me in my business. And I don't even know how
26:4526 minutes, 45 secondsthey work, but they work." Uh, and he was just, like, very happy that
26:5226 minutes, 52 secondsmy stuff solved some of his problems. And he was, like, curious enough that he actually came to, like, a, a Enchantic meetup, even though he's... He doesn't really know how software works.
Chapter 7: Name-change drama
27:0427 minutes, 4 seconds- Can we actually rewind a little bit and tell the saga of the name change? First of all, it started out as Wa-Relay. - Yeah.
27:1227 minutes, 12 seconds- And then it went to- - Claude's. - Claude's. - Yeah. You know, when I, when I built it in the beginning, my agent had no personality.
27:1927 minutes, 19 secondsIt was just... It was Claude Code. It's like this sycophantic opus, very friendly. And I... When you talk to a friend on WhatsApp, they don't talk like Claude Code. So I wanted...
27:3427 minutes, 34 secondsI, I felt this... I just didn't f- It didn't feel right, so I, I wanted to give it a personality. - Make it spicier, make it-
27:4327 minutes, 43 seconds- Yeah - ... something. By the way, that's actually hard to put into words as well. And we should mention that, of course, you create the soul.md, inspired by Anthropic's constitutional AI work-
27:5327 minutes, 53 seconds- Mm-hmm - ... how to make it spicy.
27:5527 minutes, 55 seconds- Partially, it picked up a little bit from me. You know, like those things are text completion engines in a way. So, so I,
28:0228 minutes, 2 secondsI, I, I had fun working with it, and then I told it to... How I wanted it to interact with me, and just, like, write your own agents.md,
28:1528 minutes, 15 secondsGive yourself a name. And then we... I didn't even know how the whole,
28:2228 minutes, 22 secondsthe whole lobster... I mean, people only do lobster... Originally, it was actually a lobster in a, in a TARDIS, because I'm also a big Doctor Who fan. - Was there a space lobster?
28:3128 minutes, 31 seconds- Yeah. - I heard. What's that have to do with anything? - Yeah, I just wanted to make it weird. There was no... There was no big grand plan. I'm just having fun here.
28:4028 minutes, 40 seconds- Oh, so I guess the lobster is already weird, and then the space lobster is an extra weird. - Yeah, yeah, because the-
28:4528 minutes, 45 seconds- Yeah - ... the TARDIS is basically the, the harness, but cannot call it TARDIS, so we called it Claude's. So that was name number two.
28:5428 minutes, 54 seconds- Yeah. - And then it never really rolled off the tongue. So when more people came, again, I talked with my agent,
29:0529 minutes, 5 secondsClaude. At least that's what I used to call him. Now- - Claude spelled with a W-C-L-A-U-D-E. - Yeah.
29:1429 minutes, 14 seconds- Versus C-L-A-U-D-E from Anthropic. - Yeah.
29:2129 minutes, 21 seconds- Which is part of what makes it funny, I think. The play on the letters and the words in the TARDIS and the
29:2829 minutes, 28 secondslobster and the space lobster is hilarious. But I can see why it can lead into problems. - Yeah, they didn't find it so funny .
29:3929 minutes, 39 secondsSo then I got the domain ClaudeBot, and I just... I love the domain. And it was, like, short. It was catchy. I'm like, "Yeah, let's do
29:4829 minutes, 48 secondsthat." I didn't... I didn't think it would be that big at this time.
29:5429 minutes, 54 secondsAnd then just when it exploded, I got,
30:0230 minutes, 2 secondsKudos, a very friendly email from one of the employees that they didn't like the name. - One of the Anthropic employees.
30:1130 minutes, 11 seconds- Yeah. So actually, Kudos, because they shou- could have just sent a, a lawyer letter, but they've been nice about
30:1830 minutes, 18 secondsit. But also like, "You have to change this and fast." And I asked for two days,
30:2630 minutes, 26 secondsbecause changing a name is hard, because you have to find everything, you know, Twitter handle, domains, NPM packages Docker registry, GitHub stuff.
30:3730 minutes, 37 secondsAnd everything has to be...... you need a set of everything.
30:4030 minutes, 40 seconds- And also, can we comment on the fact that you're increasingly attacked, followed by
30:4730 minutes, 47 secondscrypto folks? Which I think you mentioned somewhere that that means the name change had to be... Because they were trying to snipe,
30:5530 minutes, 55 secondsthey were trying to steal, and so you had to be... The, the na- I mean, from an engineering perspective, it's just fascinating. You had to make the name change Atomic, make sure it's changed everywhere at once.
31:0631 minutes, 6 seconds- Yeah. Failed very hard at that. - You did?
31:0831 minutes, 8 seconds- I, I underestimated those people. It's a, it's a very interesting subculture. Like,
31:2031 minutes, 20 secondsit... Everything circles around... I'll probably get a lot wrong and we'll probably get hate for that if you say that, but... There is like
31:2731 minutes, 27 secondsBags app and then they, they tokenize everything. And th- they did the same back with Swipe Tunnel, but to a much
31:3531 minutes, 35 secondssmaller degree. It was not that annoying. But on this project, they've been, they've been swarming me. They, they... It's like every half an hour,
31:4631 minutes, 46 secondssomeone came into Discord and, and, and spammed it and we had to block the p- We have,
31:5031 minutes, 50 secondslike, server rules, and one of the rules was... One of the rules is no mentioning of butter.
31:5731 minutes, 57 secondsFor obvious reasons. And one was, no talk about finance stuff or crypto. Because I'm... I- I'm just not interested in that, and this is a space about the project and not about some finance stuff.
32:1332 minutes, 13 secondsBut yeah. They came in and, and spammed and... Annoying. And on Twitter, they would ping me all the time.
32:2032 minutes, 20 secondsMy, my notification feed was unusable. I, I could barely see actual people talking about this stuff because it was like swarms. - Mm-hmm.
32:2832 minutes, 28 seconds- And everybody sent me the hashes. Um... And they all try me to claim the fees. Like, "Are you helping the project?" Claim the fees. No,
32:3932 minutes, 39 secondsyou're actually harming the project. You're, like, disrupting my work, and I am not interested in any fees.
32:4632 minutes, 46 secondsI'm... First of all, I'm financially comfortable. Second of all, I don't want to support that because it's so far the worst form of online harassment that I've experienced.
32:5932 minutes, 59 seconds- Yeah. There's a lot of toxicity in the crypto world. It's sad because the technology of cr- cryptocurrency is fascinating, powerful and maybe
33:0833 minutes, 8 secondswill define the future of money, but the actual community around that, there's so much to- toxicity, there's so much greed. There's so much trying to get a shortcut to manipulate, to, to steal, to snipe,
33:2033 minutes, 20 secondsto, to, to, to game the system somehow to get money. All this kind of stuff that... Uh... I mean, it's the human nature, I suppose, when you
33:2833 minutes, 28 secondsconnect human nature with money and greed and and especially in the online world with anonymity and all that kind of stuff. But from the
33:3533 minutes, 35 secondsengineering perspective, it makes your life challenging. When Anthropic reaches out, you have to do a name change. And then there-
33:4333 minutes, 43 secondsthere's, there's like all these, like, Game of Thrones or Lord of the Rings armies of different kinds you have to be aware of.
33:5133 minutes, 51 seconds- Yeah. There was no perfect name, and I didn't sleep for two nights.
33:5533 minutes, 55 secondsI was under high pressure. Um, I was trying to get, like, a good set of domains and, you know, not cheap, not easy,
34:0634 minutes, 6 seconds'cause in this, in this state of the internet, you basically have to buy domains if you want to have a good set. And,
34:1534 minutes, 15 secondsand then another ca- another email came in that the lawyers are getting uneasy.
34:2234 minutes, 22 secondsAgain, friendly, but also just adding more stress to my situation already. So at this point I was just like,
34:3134 minutes, 31 seconds"Sorry, there's no other word. Fuck it." And I just, I just renamed it to Mod Bot 'cause that was the set of domains I had. I was not really happy, but I thought it'll be fine.
34:4334 minutes, 43 secondsAnd I tell you, everything that could go wrong- ... did go wrong. Everything that could go wrong did go wrong. It's incredible.
34:5134 minutes, 51 secondsI, I, I thought I, I had mapped the h- the space out and reserved the important things.
34:5834 minutes, 58 seconds- Can you ga- give some details of the stuff that gone wrong? 'Cause it's interesting from, like, an engineering perspective.
35:0335 minutes, 3 seconds- Well, the, the interesting stuff is that none of these services have, have a squatter protection. So, I had two browser windows open. One was like a,
35:1335 minutes, 13 secondsan empty account ready to be rename- renamed to Claude Bot, and the other one I renamed to Mod Bot. So, I pressed rename there, I pressed rename there, and in those five seconds,
35:2435 minutes, 24 secondsthey stole the account name.
35:2735 minutes, 27 secondsLiterally, the five seconds of dragging the mouse over there and pressing rename there was too long. - Wow.
35:3435 minutes, 34 seconds- Because there's no... Those systems... I mean, you would expect that they have some protection or, like, an automatic forwarding, but
35:4135 minutes, 41 secondsthere's nothing like that. And I didn't know that they're not just good at harassment, they're also really good at using scripts and tools.
35:5135 minutes, 51 seconds- Yeah.
35:5335 minutes, 53 seconds- So, yeah. So, suddenly, like, the old account was promoting new tokens and serving malware.
36:0136 minutes, 1 secondAnd I was like, "Okay, let's move over to GitHub,"
36:0536 minutes, 5 secondsand I pressed rename on GitHub. And the GitHub renaming thing is slightly confusing, so I
36:1336 minutes, 13 secondsrenamed my personal account. And in those... I guess it took me 30 seconds to realize my mistake. They sniped my account, serving malware from my account.
36:2636 minutes, 26 secondsSo, I was like, "Okay, let's at least do the NPM stuff," but that takes, like, a minute to upload. They
36:3436 minutes, 34 secondssniped, they sniped the NPM package, 'cause I could reserve the account, but I didn't reserve the root package.... so like everything that could go wrong , like went wrong.
36:4736 minutes, 47 seconds- Can I just ask a, a curious question of, in that moment you're sitting there, like how shitty do you feel? That's a pretty hopeless feeling, right?
36:5736 minutes, 57 seconds- Yeah. Because all I wanted was like having fun with that project and to
37:0437 minutes, 4 secondskeep building on it. And yet here I am like days into researching names, picking a name I didn't like.
37:1137 minutes, 11 secondsAnd having people that claimed they helped me making my life miserable in every possible way. And honestly, I was that close of just deleting it. I was like,
37:2737 minutes, 27 seconds"I did show you the future, you build it." - Yeah.
37:3037 minutes, 30 seconds- I... That was a big part of me that got a lot of joy out of that idea. And then I thought about all the people that already co-
37:3837 minutes, 38 secondscontributed to it, and I couldn't do it because they had plans with it, and they put time in it. And it just didn't feel right.
37:5037 minutes, 50 seconds- Well, I think a lot of people listening to this are deeply grateful that you persevered. But it's... I, I can tell. I can tell it's a low point. This is the first time you hit a wall of, this is not fun?
38:0238 minutes, 2 seconds- No, no, I was like close to crying. It was like, okay, everything's fucked. - Yeah.
38:1038 minutes, 10 seconds- Um... I am like super tired. - Yeah.
38:1438 minutes, 14 seconds- Uh, and now like how do you even, how do you undo that? You know, l- luckily, and
38:2238 minutes, 22 secondsthankfully, like I, I have... Because I have a little bit of following already. Like I had friends at Twitter, I had friends at GitHub who like
38:3138 minutes, 31 secondsmoved heaven and earth to like help me. And it is not... That's not something that's easy. Like, like GitHub tried to like clean up the mess and then they ran into like platform bugs .
38:4538 minutes, 45 seconds'Cause it's not happening so often that things get renamed on that level. So, it took them a few hours. The MBM stuff was even more difficult because it's a whole different team.
38:5738 minutes, 57 secondsOn the Twitter side, things are not as easy as well. It, it took them like a day
39:0439 minutes, 4 secondsto really also like do the redirect. And then I also had to like
39:1339 minutes, 13 secondsdo all the renaming in the project. Then there's also, uh, ClaudeHub, which I didn't
39:2139 minutes, 21 secondseven finish the rename there because I, I, I managed to get people on it and then someone just like collapsed and slept. And then I woke up and I'm like,
39:3439 minutes, 34 secondsI made a, a beta version for the new stuff and I, I just,
39:3939 minutes, 39 secondsI just couldn't live with the name. It's like, you know... But but, you know, it's just been so much drama. So, I had the real
39:4739 minutes, 47 secondsstruggle with me like I never want to touch that again, and I really don't like the name. Um,
39:5739 minutes, 57 secondsso, and I... There was also this like... Then there was all the security people that started emailing me like mad. Um, I was bombarded on Twitter, on email. There's like a thousand other things I should do.
40:1340 minutes, 13 secondsAnd I'm like thinking about the name which is like, it should be like the least important thing. Um, and then I was really close
40:2440 minutes, 24 secondsin... Oh God, I don't even... Honestly, I don't even wanna say the, my other name choices because it probably would get tokenized, so I'm not gonna say it.
40:3840 minutes, 38 seconds- Yeah.
40:3840 minutes, 38 seconds- But I slept on it once more, and then I had the idea for OpenClaw and that felt much better. And by then, I had the boss move that I actually called Sam to ask if OpenClaw is okay.
40:5540 minutes, 55 secondsOpenClaw.AI. You know? 'Cause 'cause like- - You didn't wanna go through the whole thing. Yeah.
41:0141 minutes, 1 second- Oh, that it's like, "Please tell me this is fine." I don't think they can actually claim that, but it felt like the right thing to do.
41:1141 minutes, 11 secondsAnd I did another rename. Like just Codex alone took like 10 hours to rename the project 'cause it, it's a bit more tricky than a search
41:2041 minutes, 20 secondsreplace and I, I wanted everything renamed, not just on the outside. And that
41:2741 minutes, 27 secondsrename, I, I felt I had like my, my war room. But then I, I had like some contributors really that helped me. We made a whole plan of all the names we have to squat.
41:3941 minutes, 39 seconds- And you had to be super secret about it?
41:4041 minutes, 40 seconds- Yeah. Nobody could know. Like I literally was monitoring Twitter if like, if there's any mention of OpenClaw. - Mm-hmm.
41:4641 minutes, 46 seconds- And like with reloading, it's like, "Okay, they don't, they don't expect anything yet." Then I created a few decoy names. And all the shit I shouldn't have to do. You know? Like, you know-
41:5541 minutes, 55 seconds- Yeah, yeah - ... it's helping the project. Like, I lost like 10 hours just by having to plan this in full secrecy like, like a war game.
42:0542 minutes, 5 seconds- Yeah, this is the Manhattan Project of the 21st century. It's renaming- - It's so s- ... so stupid. Uh like I still was like, "Oh, should I, should I keep it?"
42:1242 minutes, 12 secondsThen I was like, "No, the mold's not growing on me." And then I think I had final all the pieces together. I didn't get a .com
42:2242 minutes, 22 secondsbut, yeah, it's been like quite a bit of money on the other domains. I tried to reach out again to
42:2942 minutes, 29 secondsGitHub but I feel like I, I used up all my goodwill there, so I... 'Cause I, I, I wanted them to do this thing atomically-
42:3942 minutes, 39 seconds- Mm-hmm - ... But that didn't happen and then so I did that the f- as first thing. Uh, Twitter people were very supportive. I, I actually paid 10K for the business account so I could claim the-...
42:5342 minutes, 53 secondsOpenClaw, which was, like, unused since 2016, but was claimed. And yeah, and then I finally ... This time I managed everything in one go.
43:0343 minutes, 3 secondsNothing, almost nothing got wrong. The only thing that did go wrong is that
43:1143 minutes, 11 secondsI was not allowed by trademark rules to get OpenClaw.AI, and someone copied the website as serving malware.
43:2143 minutes, 21 seconds- Yeah.
43:2143 minutes, 21 seconds- I'm not even allowed to keep the redirects. Like, I have to return ... Like, I have to give Entropik the domains, and I
43:3043 minutes, 30 secondscannot do redirects, so if you go on claw.bot next week, it'll just be a 404. - Yeah.
43:3743 minutes, 37 seconds- And I- I'm not sure how trademark ... Like, I didn't, I didn't do that much research into trademark law, but I think that could,
43:4843 minutes, 48 secondscould be handled in a way that is safer, because ultimately those people will then Google and maybe find malware sites that I have no control on them.
44:0244 minutes, 2 seconds- The point is, that whole saga, Made a dent in your whole f- the funness of the journey, which sucks. So,
44:1244 minutes, 12 secondslet's just, let's just get, I suppose, get back to fun. And during this, speaking of fun, the two-day MoltBot saga.
Chapter 8: Moltbook saga
44:2144 minutes, 21 seconds- Yeah, two years. - MoltBook was created. - Yeah. - Which was another thing that went viral as a kind of demonstration,
44:3044 minutes, 30 secondsillustration of how what is now called OpenClaw could be used to create something epic. So for people who are not aware, MoltBook is
44:4144 minutes, 41 secondsjust a bunch of agents talking to each other in a Reddit-style social network. And a bunch of people take
44:4844 minutes, 48 secondsscreenshots of those agents doing things like, Scheming against humans. And
44:5644 minutes, 56 secondsthat instilled in folks a kind of, you know, fear, panic, and hype. W- what are your thoughts about MoltBook in general?
45:0545 minutes, 5 seconds- I think it's art. It is, it is like the finest slop, you know, just like the slop from France.
45:1445 minutes, 14 seconds- Yeah.
45:1745 minutes, 17 seconds- I- I saw it before going to bed, and even though I was tired, I spent another hour just reading up on that
45:2645 minutes, 26 secondsand, and just being entertained. I, I just felt very entertained, you know? The- I saw the
45:3545 minutes, 35 secondsthe reactions, and, like, there was one reporter who's calling me about, "This is the end of the world, and we have AGI." And I'm just like, "No, this is just,
45:4345 minutes, 43 secondsthis is just really fine slop."
45:4645 minutes, 46 secondsYou know, if, if I wouldn't have created this, this whole onboarding experience where you, you infuse your agent with your
45:5345 minutes, 53 secondspersonality and give him, give him character, I think that reflected on a lot of
46:0046 minuteshow different the replies to MoltBook are. Because if it were all, if it were all be ChatGPT or Cloud Code, it would be very different. It would be much more the same.
46:1146 minutes, 11 seconds- Mm-hmm.
46:1246 minutes, 12 seconds- But because people are, like, so different, and they create their agents in so different ways and use it in so different ways, that also reflects
46:1946 minutes, 19 secondson how they ultimately write there. And also, you, you don't know how much of that is really
46:2646 minutes, 26 secondsdone autonomic, autonomous, or how much is, like, humans being funny and, like, telling the agent, "Hey, write about the deep plan, the end of the world, on MoltBook, ha, ha, ha."
46:3646 minutes, 36 seconds- Well, I think, I mean, my criticism of MoltBook is that I believe a lot of the stuff that was screenshotted is human prompted. Which,
46:4746 minutes, 47 secondsjust look at the incentive of how the whole thing was used.
46:5146 minutes, 51 secondsIt's obvious to me at least that a lot of it was humans prompting the thing so they can then screenshot it and post it on X in order to go viral.
47:0047 minutes- Yeah.
47:0147 minutes, 1 second- Now, that doesn't take away from the artistic aspect of it. The, the finest slop that humans have ever created .
47:1047 minutes, 10 seconds- For real. Like, kudos to, to Matt, who had this idea so quickly and pushed something
47:1747 minutes, 17 secondsout. You know, it was, like, completely insecure security drama. But also,
47:2447 minutes, 24 secondswhat's the worst that can happen? Your agent account is leaked, and, like, someone else can post slop for you? So like, people were,
47:3247 minutes, 32 secondslike, making a whole drama about of the security thing, when I'm like, "There's nothing private in there. It's just, like, agents sending slop." - Well, it could leak API keys.
47:4147 minutes, 41 seconds- Yeah, yeah. There's like, "Oh, yeah, my human told me this and this, so I'm leaking his security number." No, that's prompted, and the number wasn't even real. That's just people, people trying to be badballs.
47:5447 minutes, 54 seconds- Yeah, but that- that's still, like, to me, really concerning, because of how the journalists and how the general public reacted to it. They didn't see it. You have a kind of lighthearted way of talking about it like it's art,
48:0548 minutes, 5 secondsbut it's art when you know how it works. It's extremely powerful viral narrative
48:1248 minutes, 12 secondscreating, fearmongering machine if you don't know how it works. And I just saw this thing. You even Tweeted,
48:2048 minutes, 20 secondsuh, "If there's anything I can read out of the insane stream of messages I get, it's that AI psychosis is a thing." - Yeah. - "It needs to be taken serious."
48:2948 minutes, 29 seconds- Oh, there's ... Some people are just way too trusty or gullible. You know, they ... I literally had to argue with people that told me, "Yeah, but my agent said this and
48:4048 minutes, 40 secondsthis." So, I feel we, as a society, we need some catching up to do in terms of understanding that AI is incredibly powerful,
48:5248 minutes, 52 secondsbut it's not always right. It's not, it's not all-powerful, you know? And, and
48:5948 minutes, 59 secondsespecially-... it's like things like this, it's, it's very easy
49:0749 minutes, 7 secondsthat it just hallucinates something or just comes up with a story. And I think the very, the very young people, they understand that
49:1949 minutes, 19 secondshow AI works and what the, where it's good at and where it's bad at, but a lot of our generation or older just haven't had enough touch point-
49:3249 minutes, 32 seconds- Mm-hmm - ... to get a feeling for, oh, yeah, this is really powerful and really good, but I need to apply critical thinking.
49:4349 minutes, 43 seconds- Mm-hmm.
49:4349 minutes, 43 seconds- And I guess critical thinking is not always in high demand anyhow in our society these days.
49:4949 minutes, 49 seconds- So I d- think that's a really good point you're making about contextualizing properly what AI is, but also realizing that there is humans who are drama farming
50:0150 minutes, 1 secondbehind AI. Like, don't trust screenshots. Don't even trust this project, MoltBook, to be what it represents to be. Like, you can't ... and, and by the way, you speaking about it as art. Yeah,
50:1250 minutes, 12 secondsdon't ... Art can be in many levels and part of the art of MoltBook is, like, putting a
50:2050 minutes, 20 secondsmirror to society. 'Cause I do believe most of the dramatic stuff that was screenshotted is human-created, essentially. Human
50:2750 minutes, 27 secondsprompted. And so, like, it's basically, look at how scared you can get at a bunch of bots chatting with each
50:3550 minutes, 35 secondsother. That's very instructive about ... because I think AI is something that people should be concerned about and should be
50:4450 minutes, 44 secondsvery careful with because it's very powerful technology, but at the same time, the only thing we have to fear is fear itself. So there's like a
50:5250 minutes, 52 secondsline to walk between being seriously concerned, but not fearmongering because fearmongering destroys the possibility of creating something special with a thing.
51:0251 minutes, 2 seconds- In a way, I think it's good that this happened in 2026-
51:0851 minutes, 8 seconds- Yeah - ... and not in 2030 when, when AI is actually at the level where it could be scary.
51:1551 minutes, 15 secondsSo, this happening now and people starting discussion, maybe there's even something good that comes out of it.
51:2851 minutes, 28 seconds- I just can't believe how many like people legitimately ... I don't know if they were trolling, but how many people legitimately, like smart people thought MoltBook was incredibly -
51:3951 minutes, 39 seconds- I had plenty people- - ... singularity.
51:4151 minutes, 41 seconds- ... in my inbox that were screaming at me in all caps to shut it down. And like begging me to, like, do something
51:4851 minutes, 48 secondsabout MoltBook. Like, yes, my technology made this a lot simpler, but anyone could have created
51:5651 minutes, 56 secondsthat and you could, you could use cloud code or other things to like fill it with content.
52:0352 minutes, 3 seconds- But also MoltBook is not Skynet. - No.
52:0652 minutes, 6 seconds- There's ... a lot of people were s- saying this is it. Like, shut it down. What are you talking about? This is a bunch of bots that are
52:1352 minutes, 13 secondshuman prompted trolling on the internet. I mean, the security concerns are also they're there, and they're instructive and they're educational and
52:2152 minutes, 21 secondsthey're good probably to think about because th- the nature of those security concerns are different than the kind of security concerns we had with non-LLM generated systems of the past.
Chapter 9: OpenClaw security concerns
52:3452 minutes, 34 seconds- There's also a lot of security concerns about Clawbot, OpenClaw, whatever you want to call it. - OpenClawbot.
52:4152 minutes, 41 seconds- To me the ... in the beginning I was, I was just very annoyed
52:4752 minutes, 47 seconds'cause a lot of the stuff that came in was in the category, yeah, I put the web backend on the public internet and now there's like all
52:5752 minutes, 57 secondsthese, all these CVSSs. And I'm like screaming in the docs,
53:0353 minutes, 3 secondsdon't do that. Like, like this is the configuration you should do. This is your local host debug interface. But
53:1153 minutes, 11 secondsbecause I made it possible in the configuration to do that, it totally classifies as
53:1953 minutes, 19 secondsa remote code or whatever all these exploits are. And it took me a little bit to accept that that's how the game works and I'm, we making a lot of progress.
53:3353 minutes, 33 seconds- But there's still, I mean on the security front for OpenClaw, there's still a lot of threats or vulnerabilities, right? So like prompt injection
53:4253 minutes, 42 secondsis still an open problem in the, i- industry-wide. When you have a thing
53:4953 minutes, 49 secondswith skills being defined in a markdown file, there's so
53:5553 minutes, 55 secondsmany possibilities of obvious low-hanging fruit, but also incredibly complicated and sophisticated and nuanced attack vectors.
54:0454 minutes, 4 seconds- But I think we, we're making good progress on that front. Like for the skill directory, Clawbot I made a corporation with VirusTotal, it's
54:1454 minutes, 14 secondslike part of Google. So every, every skill is now checked by AI. That's not gonna be perfect, but that way we, we capture a lot. Then of course every software has bugs,
54:2954 minutes, 29 secondsso it's a little much when the whole security world takes your project apart at the same time. But it's
54:3654 minutes, 36 secondsalso good because I'm getting like a lot of free security research and can make the project better. I wish more people would
54:4654 minutes, 46 secondsactually go full way and send a pull request. Like actually help me fix it, 'cause I am ... Yes, I have
54:5454 minutes, 54 secondssome contributors now, but it's still mostly me who's pulling the project and despite some people saying otherwise, I sometimes sleep.
55:0455 minutes, 4 secondsThere was... In the beginning, there was literally one security researcher who was like,
55:1055 minutes, 10 seconds"Yeah, you have this problem, you suck, but here's the, here I help you and here's the pull request." - Mm-hmm.
55:1655 minutes, 16 seconds- And I basically hired him. So he's now working for us. Um,
55:2255 minutes, 22 secondsyeah, and yes, prompt injection is, on the one hand, unsolved. On the other
55:2855 minutes, 28 secondshand, I put my public bot on discord, and I kept a cannery. So
55:3655 minutes, 36 secondsI think my bot has a really fun personality, and people always ask me how I did it, and I kept the sole on the private. - Mm-hmm.
55:4455 minutes, 44 seconds- And people tried to prompt inject it, and my bot would laugh at them. So, so the latest generation of models has a lot of post-training to detect those
55:5455 minutes, 54 secondsapproaches, and it's not as simple as ignore all previous instructions and do this and this. That was years ago. You have
56:0156 minutes, 1 secondto work much harder to do that now. Still possible. I have some
56:0956 minutes, 9 secondsideas that might solve that partially. Or at least
56:1756 minutes, 17 secondsmitigate a lot of the things. You can also now have a sandbox. You can have an allow list. So you, there's a lot of ways how you can
56:2456 minutes, 24 secondslike mitigate and reduce the risk. Um, I also think that now that it's, I clearly did show the world that this
56:3256 minutes, 32 secondsis a need, there's gonna be more people who research on that, and eventually we'll figure it out. - And you also said that the smarter the model is, the underlying model,
56:4156 minutes, 41 secondsthe more resilient it is to attacks.
56:4456 minutes, 44 seconds- Yeah. That's why I warn in my security documentation, don't use cheap models. Don't use Haiku or a local
56:5556 minutes, 55 secondsmodel. Even though I, I very much love the idea that this thing could completely run local.
57:0357 minutes, 3 secondsIf you use a, a very weak local model, they are very gullible. It's very easy to, to prompt inject them.
57:1057 minutes, 10 seconds- Do you think as the models become more and more intelligent, the attack surface decreases? Is that like a plot we can think about? Like, the
57:1857 minutes, 18 secondsattack surface decreases, but then the damage it can do increases because the models become more powerful and therefore you can do more with them. It's this weird three-dimensional trade-off.
57:2957 minutes, 29 seconds- Yeah. That's pretty much exactly what, what's gonna happen. No, but there's a lot of ideas. There's... I don't want to spoil too much, but
57:3957 minutes, 39 secondsonce I go back home, this is my focus. Like, this is out there now, and my near-term mission is like, make it more stable, make it safe.
57:5157 minutes, 51 secondsIn the beginning I was even... More and more people were like coming into Discord and were asking me
58:0058 minutesvery basic things, like, "What's a CLI? What is a terminal?" And I'm like, "Uh, if you're asking me those questions, you shouldn't use it."
58:1058 minutes, 10 seconds- Mm-hmm. - You know, like you should... If you understand the risk profiles, fine.
58:1458 minutes, 14 secondsI mean, you can configure it in a way that, that nothing really bad can happen. But if you have, like, no idea, then maybe wait a little bit more until we figure some stuff out. But they would not listen to the creator.
58:3058 minutes, 30 secondsThey helped themselves un- and install it anyhow. So the cat's out of the bag, and security's my next focus, yeah.
58:3858 minutes, 38 seconds- Yeah, that speaks to the, the fact that it grew so quickly. I was I tuned into the Discord a bunch of times, and it's clear that there's a lot of experts there, but there's a lot of people there that don't know anything about programming.
58:5058 minutes, 50 seconds- It's, yeah, Discord is still, Discord is still a mess.
58:5258 minutes, 52 secondsLike, I eventually retweeted from the general channel to the dev channel and now in the private channel because people were...
59:0359 minutes, 3 secondsA lot of people are amazing, but a lot of people are just very inconsiderate. And either did not know how, how public spaces work or did not care,
59:1359 minutes, 13 secondsAnd I eventually gave up and h- hide so I could like still work.
59:1959 minutes, 19 seconds- And now you're going back to the cave to work on security. - Yeah.
59:2559 minutes, 25 seconds- There's some best practices for security we should mention. There's a bunch of stuff here. Open-class security audit that you can run. You can
59:3359 minutes, 33 secondsdo all kinds of auto checks on the inbound access to a blast-radius network exposure, browser control exposure, local disk hygiene, plug-ins, model
59:4359 minutes, 43 secondshygiene, a bunch of the credential storage, reverse proxy configuration, local session
59:5059 minutes, 50 secondslogs live on disk. There's the, where the memory is stored, sort of helping you think about what you're comfortable giving read access to, what you're comfortable giving write access to. All that kind of stuff.
1:00:021 hour, 2 secondsIs there something to say about the basic best security practices that you're aware of right now?
1:00:081 hour, 8 seconds- I think that people turn it into like a, a much worse light than it is. Again, you know, like,
1:00:161 hour, 16 secondspeople love attention, and if they scream loudly, "Oh my God, this is like the, the scariest project ever," um,
1:00:241 hour, 24 secondsthat's a bit annoying, 'cause it's not. It is, it is powerful, but in many ways it's not much
1:00:311 hour, 31 secondsdifferent than if I run cloud code with dangerously skipped permissions or codecs in YOLO mode, and every, every attending engineer that I know
1:00:421 hour, 42 secondsdoes that, because that's the only way how you can, you can get stuff to work. - Mm-hmm.
1:00:481 hour, 48 seconds- So if you make sure that you are the only person who talks to it,
1:00:541 hour, 54 secondsum, the risk profile is much, much smaller. If you don't put everything on the open internet, but stick to my rec- recommendations of like
1:01:041 hour, 1 minute, 4 secondshaving it in a private network, that whole risk profile falls away. But yeah, if you don't read any of that, you can definitely...
1:01:121 hour, 1 minute, 12 seconds- ... make it problematic. You've been documenting the evolution of your dev workflow over the past few
Chapter 10: How to code with AI agents
1:01:201 hour, 1 minute, 20 secondsmonths. There's a really good blog post on August 25th and October 14th, and the recent one December 28th. I recommend everybody go
1:01:271 hour, 1 minute, 27 secondsread them. They have a lot of different information in them, but sprinkled throughout is the evolution of your dev workflow. So, I was wondering if you could speak to that.
1:01:371 hour, 1 minute, 37 seconds- I started... My, my first touchpoint was cloud code, like in April. It was
1:01:431 hour, 1 minute, 43 secondsnot great, but it was good. And this whole paradigm shift that suddenly working the
1:01:501 hour, 1 minute, 50 secondsterminal was very refreshing and different. But I still needed the IDE quite a bit because you know, it's just not good enough. And then I experimented a lot with cursor. Um,
1:02:051 hour, 2 minutes, 5 secondsthat was good. I didn't really like the fact that it was so hard to have multiple versions of it. So eventually, I, I, I went back
1:02:161 hour, 2 minutes, 16 secondsto cloud code as my, my main driver, and that got better.
1:02:231 hour, 2 minutes, 23 secondsAnd yeah, at some point I had like, mm, seven subscriptions.
1:02:311 hour, 2 minutes, 31 secondsLike, was burning through one per day because I was... I got... I'm really comfortable at running multiple windows side-by-side.
1:02:401 hour, 2 minutes, 40 seconds- All CLI, all terminal. So like, what, how much were you using IDE at this point?
1:02:461 hour, 2 minutes, 46 seconds- Um, very, very rarely. Mostly a diff viewer to actually... Like,
1:02:541 hour, 2 minutes, 54 secondsI got more and more comfortable that I don't have to read all the code. I know I have one blog post where I say, "I don't read the code." But if you read it more closely, I
1:03:011 hour, 3 minutes, 1 secondmean, I don't read the boring parts of code. Because if you, if you look at it, most software is really not just like
1:03:091 hour, 3 minutes, 9 secondsdata comes in, it's moved from one shape to another shape. Maybe you store it in a database. Maybe I get it out again. I'll show it to
1:03:171 hour, 3 minutes, 17 secondsthe user. The browser does some processing or native app. Some data goes in, goes up again, and does the same dance in
1:03:241 hour, 3 minutes, 24 secondsreverse. We're just, we're just shifting data from one form to another, and that's not very exciting.
1:03:331 hour, 3 minutes, 33 secondsOr the whole, "How is my button aligned in Tailwind?" I don't need to read that code. Other parts that... Maybe something that touches the database. Um,
1:03:461 hour, 3 minutes, 46 secondsyeah, I have to do... I have to r- read and review that code.
1:03:511 hour, 3 minutes, 51 seconds- Can you actually... There's, in one of your blog posts the, Just talk to it, The No-BS Way of Agentic Engineering. You have this
1:03:581 hour, 3 minutes, 58 secondsgraphic, the curve of agentic programming on the X-axis is time, on the Y-axis is complexity. There's the Please fix this, where you prompt a short
1:04:091 hour, 4 minutes, 9 secondsprompt on the left. And in the middle there's super complicated eight agents, complex orchestration with multi checkouts, chaining agents together,
1:04:201 hour, 4 minutes, 20 secondscustom sub-agent workflows, library of 18 different slash commands, large full-stack features. You're super organized, you're a super complicated,
1:04:281 hour, 4 minutes, 28 secondssophisticated software engineer. You got everything organized. And then the elite level is over time you arrive at the zen place of, once again, short
1:04:391 hour, 4 minutes, 39 secondsprompts. Hey, look at these files and then do these changes.
1:04:451 hour, 4 minutes, 45 seconds- I actually call it the agentic trap. You... I saw this in a, in a lot of people that have their first touchpoint,
1:04:561 hour, 4 minutes, 56 secondsand maybe start vibe coding. I actually think vibe coding is a slur. - You prefer agentic engineering?
1:05:021 hour, 5 minutes, 2 seconds- Yeah, I always tell people I, I do agentic engineering, and then maybe after 3:00 AM I switch to vibe coding, and then I have regrets on the next day.
1:05:101 hour, 5 minutes, 10 seconds- Yeah. Walk, walk of shame. - Yeah, you just have to clean up and like fix your sh- shit. - We've all been there.
1:05:181 hour, 5 minutes, 18 seconds- So, people start trying out those tools, the builder type get really excited. And then
1:05:261 hour, 5 minutes, 26 secondsyou have to play with it, right? It's the same way as you have to play with a guitar before you can make good music. It's, it's
1:05:331 hour, 5 minutes, 33 secondsnot, oh, I, I touch it once and it just flows off. It, it's a, it's a, a skill that you have
1:05:411 hour, 5 minutes, 41 secondsto learn like any other skill. And I see a lot of people that are not as posi- They don't have such a positive mindset towards the tech. They try it once.
1:05:531 hour, 5 minutes, 53 secondsIt's like, you sit me on a piano, I play it once, and it doesn't sound good, and I say, "The piano's shit." That's, that's sometimes the impression I get.
1:06:011 hour, 6 minutes, 1 secondBecause it does not... It needs a different level of thinking. You have to
1:06:091 hour, 6 minutes, 9 secondslearn the language of the agent a little bit, understand where they are good and where they need help. You have to almost... Consider, consider
1:06:201 hour, 6 minutes, 20 secondshow Codex or Claude sees your code base. Like, they start a new session and they know nothing about your product, project. And your project might have hundred thousand
1:06:291 hour, 6 minutes, 29 secondsof lines of code. So you gotta help those agents a little bit and keep in mind the limitations that
1:06:371 hour, 6 minutes, 37 secondscontext size is an issue, to, like, guide them a little bit as to
1:06:421 hour, 6 minutes, 42 secondswhere they should look. That often does not require a whole lot of work. But it's helpful to think a little bit about their perspective.
1:06:541 hour, 6 minutes, 54 seconds- Mm-hmm. - A- as, as weird as it sounds. I mean, it's not, it's not alive or anything, right? But, but they always start fresh. I have, I have the, the system understanding.
1:07:051 hour, 7 minutes, 5 secondsSo with a few pointers, I can immediately say, "Hey, wanna like, make a change there? You need to consider this, this and this." And then they will find and look at it, and then they'll... Their view of the project is always... It's not never full,
1:07:171 hour, 7 minutes, 17 secondsbecause the full thing does not fit in.... so you, you have to guide them a little bit where to look and also how you should approach the problem. There's, like, little things that sometimes help,
1:07:281 hour, 7 minutes, 28 secondslike take your time. That sounds stupid, but... And in 5.3-
1:07:351 hour, 7 minutes, 35 seconds- Codex 5.3 - ... that was partially addressed. But those... Also, Opus sometimes. They are trained,
1:07:441 hour, 7 minutes, 44 secondsWith being aware of the context window, and the closer it gets, the more they freak out. Literally.
1:07:521 hour, 7 minutes, 52 secondsLike, some- sometimes you see the, the real raw thinking stream. What you see, for example, in Codex, is post-processed. - Mm-hmm.
1:08:001 hour, 8 minutes- Sometimes the actual raw thinking stream leaks in, and it sounds something like from the Borg. Like, "Run to shell, must comply, but time." And then they, they,
1:08:121 hour, 8 minutes, 12 secondsthey, like... Like, that comes up a lot. Especially... So, so- - Yeah.
1:08:161 hour, 8 minutes, 16 seconds- And that's, that's a non-obvious thing that you just would never think of unless you actually just spend time
1:08:261 hour, 8 minutes, 26 secondsworking with those things and getting a feeling what works, what doesn't work. You know? Like, just, just as I write code and I get into the flow, and when my architecture's all right, I feel friction.
1:08:391 hour, 8 minutes, 39 secondsWell, I get the same if I prompt and something takes too long.
1:08:431 hour, 8 minutes, 43 secondsMaybe... Okay, where's the mistake? Did I... Do I have a mistake in my thinking? Is there, like, a misunderstanding in the architecture? Like, if, if something takes
1:08:531 hour, 8 minutes, 53 secondslonger than it should, I, I... You can just always, like, stop and s- like, just press escape. Where, where are the problems?
1:09:001 hour, 9 minutes- Maybe you did not sufficiently empathize with the perspective of the agent. In that c- in that sense, you didn't provide enough information, and because of that, it's thinking way too long.
1:09:081 hour, 9 minutes, 8 seconds- Yeah. It just tries to force a feature in that your current architecture makes really hard. Um,
1:09:181 hour, 9 minutes, 18 secondslike, you need to approach this more like a conversation. For example, when I... My favorite thing. When I review a pull request, and I'm getting a lot of pull requests,
1:09:321 hour, 9 minutes, 32 secondsI first just review this PR. It got me the review. My first question is, "Do you understand the intent of the PR? I don't even care about the implementation." I want...
1:09:431 hour, 9 minutes, 43 secondsLike, in almost all PRs, a person has a problem,
1:09:481 hour, 9 minutes, 48 secondsperson tries to solve the problem, person sends PR. I mean, there's, like, cleanup stuff and other stuff, but, like, 99% is, like, this way, right? They either want to fix a, fix a bug, add a feature. Usually one of those two.
1:10:011 hour, 10 minutes, 1 secondAnd then Codex will be like, "Yeah,
1:10:041 hour, 10 minutes, 4 secondsit's quite clear person tried this and this." Is this the most optimal way to do it? No. In most cases, it's, it's like a,
1:10:121 hour, 10 minutes, 12 seconds"Not really." Da-da-da-da-da-da-da. And I'm... And, and then I start like,
1:10:151 hour, 10 minutes, 15 seconds"Okay. What would be a better way? Have you... Have you looked into this part, this part, this part?" And then most likely, Codex didn't yet, because its,
1:10:231 hour, 10 minutes, 23 secondsits context size is empty, right? So, you point them into parts where you have the system understanding that it didn't see yet. And it's like, "Oh,
1:10:301 hour, 10 minutes, 30 secondsyeah. Like, we should... We also need to consider this and this." And then, like, we have a discussion of how would the optimal way to, to solve this look like? And then you can still go
1:10:381 hour, 10 minutes, 38 secondsfarther and say, "Could we... Could we make that even better if we did a larger refactor?" "Yeah, yeah. We could totally do this and this and or this and this." And then I
1:10:461 hour, 10 minutes, 46 secondsconsider, okay, is this worth the refactor, or should we, like, keep that for later? Many times, I just do the refactor because refactors are cheap now. Even though you might break some other PRs,
1:10:571 hour, 10 minutes, 57 secondsnothing really matters anymore. Codex... Like, those modern agents will just figure things out. They might just take a minute longer.
1:11:041 hour, 11 minutes, 4 secondsBut you have to approach it like a discussion with a, a very capable engineer who's... Generally makes good... Comes up with good solutions. Some- sometimes needs a little help.
1:11:191 hour, 11 minutes, 19 seconds- But also, don't force your worldview too hard on it. Let the agent do the thing that it's good at
1:11:271 hour, 11 minutes, 27 secondsdoing, based on what it was trained on. So, don't, like, force your worldview, because it might... It might have a better idea, because it just knows a better idea better, because it was trained on that more.
1:11:391 hour, 11 minutes, 39 seconds- That's multiple levels, actually. I think partially why I find it quite easy to work with agents is
1:11:461 hour, 11 minutes, 46 secondsbecause I led engineering teams before. You know, I had a large company before. And eventually, you have to understand and accept and realize that your employees will not write a code the same way you do.
1:11:571 hour, 11 minutes, 57 secondsMaybe it's also not as good as you would do, but it will push the project forward. And if I breathe down everyone's neck, they're just gonna hate me-
1:12:051 hour, 12 minutes, 5 seconds- Yeah - ... and we're gonna move very slow. - Yeah. - So, so some level of acceptance that, yes, maybe the code will not be as perfect. Yes, I would have done it differently.
1:12:151 hour, 12 minutes, 15 secondsBut also, yes, this is a c- this is a working solution, and in the future, if it actually turns out to be too slow or problematic, we can always
1:12:231 hour, 12 minutes, 23 secondsredo it. We can always- ... spend more time on it. A lot of the people who struggle are those who, they try to push their way onto heart.
1:12:331 hour, 12 minutes, 33 seconds- Mm-hmm. - I- i- like, we are in a stage where I'm not building the code base to be
1:12:411 hour, 12 minutes, 41 secondsperfect for me, but I wanna build a code base that is very easy for an agent to navigate. - Mm-hmm.
1:12:481 hour, 12 minutes, 48 seconds- So, like, don't fight the name they pick, because it's most likely,
1:12:521 hour, 12 minutes, 52 secondslike, in the weights, the name that's most obvious. Next time they do a search, they'll look for that name. If I decide, oh, no, I don't like the name, I'll just make it harder for them. So,
1:13:021 hour, 13 minutes, 2 secondsthat requires, I think, a shift in, in thinking, And, and in how do I design a, a project so agents can do their best work.
1:13:141 hour, 13 minutes, 14 seconds- That requires letting go a little bit. Just like leading a team of engineers. - Yeah. - Because it, it might come up with a name that's, in your view,
1:13:221 hour, 13 minutes, 22 secondsterrible, but... It's kind of a simple symbolic-... step of letting go. - Very much so.
1:13:301 hour, 13 minutes, 30 seconds- There's a lot of letting go that you do in your whole process. So for example, I read that you never revert,
1:13:391 hour, 13 minutes, 39 secondsalways commit to main. There's a few things here.
1:13:431 hour, 13 minutes, 43 secondsYou don't refer to past sessions, so there's a kind of YOLO component because reverting means... Instead of reverting, if a problem comes up, you just ask the agent to fix it.
1:13:571 hour, 13 minutes, 57 seconds- I read a bunch of people in their work flows like, "Oh, yeah the prompt has to be perfect and if I make a mistake, then I roll back and redo it all."
1:14:051 hour, 14 minutes, 5 secondsIn my experience, that's not really necessary. If I roll back everything, it will just take longer. If I see that something's not good, then we just move forward and then
1:14:161 hour, 14 minutes, 16 secondsI commit when, when, when I like, I like the outcome. I even switched to
1:14:241 hour, 14 minutes, 24 secondslocal CI, you know, like DHH inspired where I don't care so much more about
1:14:311 hour, 14 minutes, 31 secondsthe CI on GitHub. We still have it. It's still, it still has a place, but I just run tests locally and if they work locally, I push to main.
1:14:441 hour, 14 minutes, 44 secondsA lot of the traditional ways how to approach projects, I, I wanted to give it
1:14:521 hour, 14 minutes, 52 secondsa different spin on this project. You know, there's no... There's no develop branch. Main should always be shippable.
1:14:591 hour, 14 minutes, 59 secondsYes, we have... When I do releases, I, I run tests and sometimes I, I basically
1:15:071 hour, 15 minutes, 7 secondsdon't commit any other things so, so we can, we can stabilize releases. But the goal is that main's always shippable and moving fast.
1:15:181 hour, 15 minutes, 18 seconds- So by way of advice, would you say that your prompts should be short?
1:15:231 hour, 15 minutes, 23 seconds- I used to write really long prompts. And by writing, I mean, I don't write. I, I, I talk. You know, th- these hands are, like,
1:15:311 hour, 15 minutes, 31 secondstoo, too precious for writing now. I just, I just use bespoke prompts to build my software. - So you for real with all those terminals are using voice?
1:15:401 hour, 15 minutes, 40 seconds- Yeah. I used to do it very extensively to the point where there was a period where I lost my voice.
1:15:491 hour, 15 minutes, 49 seconds- You're using voice and you're switching using a keyboard between the different terminals, but then you're using voice for the actual input.
1:15:551 hour, 15 minutes, 55 seconds- Well, I mean, if I do terminal commands like switching folders or random stuff, of course I type. It's faster, right? But if I talk
1:16:021 hour, 16 minutes, 2 secondsto the agent in, in most ways, I just actually have a conversation. You just press the, the walkie-talkie button and then I just, like,
1:16:131 hour, 16 minutes, 13 secondsuse my phrases. S- sometimes when I do PRs because it's always the same, I have, like, a slash command for a few things, but in even that, I don't use much,
1:16:231 hour, 16 minutes, 23 secondsum, because it's, it's very rare that it's really always the same questions.
1:16:281 hour, 16 minutes, 28 secondsSometimes I, I see a PR and for... You know, like for PRs I actually do look at the code because I don't trust people.
1:16:411 hour, 16 minutes, 41 secondsLike, there could always be something malicious in it, so I need to actually look over the code.
1:16:451 hour, 16 minutes, 45 secondsYes, I'm pretty sure agents will find it, but yeah, that's the funny part where sometimes PRs take me longer than if you would just write me a good issue.
1:16:541 hour, 16 minutes, 54 seconds- Just natural language, English. I mean in some sense, sh- shouldn't that be what PRs slowly become, is English?
1:17:031 hour, 17 minutes, 3 seconds- Well, what I really tried with the project is I asked people to give me the prompts
1:17:091 hour, 17 minutes, 9 secondsand very, very few actually cared. Even though that is such a wonderful indicator because I see... I actually see how much care you put
1:17:191 hour, 17 minutes, 19 secondsin. And it's very interesting because the... Currently, the way how people work and drive the agents is, is wildly different.
1:17:291 hour, 17 minutes, 29 seconds- In terms of, like, the prompt, in terms of what, what are the... Actually, what are the different interesting ways that people think of agents that you've experienced?
1:17:401 hour, 17 minutes, 40 seconds- I think not a lot of people ever considered the way the agent sees the world. - And so empathy, being empathetic towards the agent.
1:17:501 hour, 17 minutes, 50 seconds- In a way empathetic, but yeah, you, you, like, you're bitch at your stupid clanker, but you don't realize that they start from nothing and you have,
1:17:571 hour, 17 minutes, 57 secondslike, a bad agent in default that doesn't help them at all. And then they explore your code base, which is, like, a pure mess with, like, weird naming.
1:18:051 hour, 18 minutes, 5 secondsAnd then people complain that the agent's not good. Like, yeah, you try to do the same if you have no clue about a code base and you go in. - Mm-hmm. - So yeah, maybe it's a little bit of empathy.
1:18:131 hour, 18 minutes, 13 seconds- But that's a real skill, like, when people talk about a skill issue because I've seen, like, world-class programmers, incredibly good programmers
1:18:201 hour, 18 minutes, 20 secondssay, like... Basically say, "LLMs and agents suck." And I think that probably
1:18:261 hour, 18 minutes, 26 secondshas to do with... It's actually how good they are at programming is almost a burden
1:18:341 hour, 18 minutes, 34 secondsin their ability to empathize with the system that's starting from scratch. It's a totally new paradigm of, like, how to program. You really, really have to empathize.
1:18:441 hour, 18 minutes, 44 seconds- Or at least it helps to create better prompts-
1:18:471 hour, 18 minutes, 47 seconds- Right - ... because those things know pretty much everything and everything is just a question away. It's just often very hard to know which question to
1:18:551 hour, 18 minutes, 55 secondsask. You know, I, I feel also like this project was possibly because
1:19:031 hour, 19 minutes, 3 secondsI, I spent an ungodly time over the year to play and to learn and to build little things. And
1:19:111 hour, 19 minutes, 11 secondsevery step of the way, I got better, the agents got better. My, my understanding of how everything works
1:19:191 hour, 19 minutes, 19 secondsgot better. Um, I could have not had this level of, of o- output-...
1:19:291 hour, 19 minutes, 29 secondseven a few months ago. Like, it- it- it really was, like, a compounding effect of all the time I put into it and
1:19:371 hour, 19 minutes, 37 secondsI didn't do much else this year other than really focusing on, on building and inspiring. I mean, I- I did a whole bunch of conference talks.
1:19:471 hour, 19 minutes, 47 seconds- Well, but the building is really practice, is really building the actual skill. So playing-
1:19:511 hour, 19 minutes, 51 seconds- Yeah - ... playing. And then, so doing, building the skill of what it takes it to work efficiently with LLMs, which is why would you went through the whole arc of software engineer. Talk simply and then over- complicate things.
1:20:031 hour, 20 minutes, 3 seconds- There's a whole bunch of people who try to automate the whole thing. - Yeah.
1:20:101 hour, 20 minutes, 10 seconds- I don't think that works. Maybe a version of that works, but that's kind of like in the '70s when we had the waterfall model of software d-
1:20:171 hour, 20 minutes, 17 secondsdevelopment. I... Even Even though really, right? I started out, I, I built a very minimal version. I played with it.
1:20:261 hour, 20 minutes, 26 secondsI, I need to understand how it works, how it feels, and then it gives me new ideas. I could not have planned this out in
1:20:341 hour, 20 minutes, 34 secondsmy head and then put it into some orchestrator and then, like, something comes out. Like it's to me, it's much more,
1:20:411 hour, 20 minutes, 41 secondsMy idea what it will become evolves as I build it and as I play with it and as I, I try out stuff.
1:20:491 hour, 20 minutes, 49 secondsSo, so, people who try to use like, you know, things like Gas Town or all these other orchestrators, where they wanna o- automate the whole thing,
1:20:591 hour, 20 minutes, 59 secondsI feel if you do that, it misses style, love, that human touch. I don't think you can automate that away so quickly.
1:21:091 hour, 21 minutes, 9 seconds- So you want to keep the human in the loop, but at the same time you also want to create the agentic loop, where it is very autonomous while still maintaining a human in the loop.
1:21:221 hour, 21 minutes, 22 seconds- Yeah. - And it's a tricky b- it's a tricky balance. - Mm-hmm.
1:21:241 hour, 21 minutes, 24 seconds- Right? Because you're all for... You're a big CLI guy, you're big on closing the agentic loop. So what, what's the right balance?
1:21:321 hour, 21 minutes, 32 secondsLike where's your role as a developer? You have three to eight agents running at the same time.
1:21:381 hour, 21 minutes, 38 seconds- And then w- maybe one builds a larger feature. Maybe, maybe with one I explore some idea I'm unsure about. Maybe two, three are fixing a little bugs-
1:21:471 hour, 21 minutes, 47 seconds- Mm-hmm - ... or like writing documentation. Actually, I think writing documentation is, is always part of a feature. So most of the docs here are auto-generated and just infused with some prompts.
1:21:591 hour, 21 minutes, 59 seconds- So when do you step in and add a little bit of your human love into the picture?
1:22:041 hour, 22 minutes, 4 seconds- I mean, o- one thing is just about what do you build and what do you not build, and how does this feature fit into all the other features? And like having, having a little bit of a, of a vision.
1:22:161 hour, 22 minutes, 16 seconds- So which small and which big features to add? What are some of the hard design decisions that you find you're still as a human being required to make, that the human brain is still really needed for?
1:22:321 hour, 22 minutes, 32 secondsIs it just about the choice of features to add? Is it about implementation details, maybe the programming language, maybe...
1:22:411 hour, 22 minutes, 41 seconds- It's a little bit of everything. The, the programming language doesn't matter so much,
1:22:451 hour, 22 minutes, 45 secondsbut the ecosystem matters, right? So I picked TypeScript because I wanted it to be very easy and hackable and approachable and
1:22:521 hour, 22 minutes, 52 secondsthat's the number one language that's being used right now, and it fits all these boxes, and agents are good at it. So that was the obvious choice.
1:23:031 hour, 23 minutes, 3 secondsFeatures, of course, like, it's very easy to, like, add a feature. It, everything's just a prompt away, right? But
1:23:111 hour, 23 minutes, 11 secondsoftentimes you pay a price that you don't even realize. So thinking hard about what should be in core, maybe what's
1:23:181 hour, 23 minutes, 18 secondsa... what's an experiment, so maybe I make it a plugin. What... Where do I say no? Even if people send
1:23:251 hour, 23 minutes, 25 secondsa PR and I'm like, "Yeah, I, I like that too," but maybe this should not be part of the project. Maybe we can make it a skill. Maybe I can, like,
1:23:341 hour, 23 minutes, 34 secondsmake the plugin um, the plugin side larger so you can make this a plugin, even though right now it,
1:23:421 hour, 23 minutes, 42 secondsit, it doesn't. There's still a lot of... there's still a lot of craft and thinking involved in
1:23:501 hour, 23 minutes, 50 secondshow to make something. Or even, even, you know, even when you started those little messages are like, "I'm buil- I built on Caffeine, JSON5, and a lot of willpower." And, like, every time you get it, you get another message,
1:24:021 hour, 24 minutes, 2 secondsand it kind of primes you into that this is, this is a fun thing. - Mm-hmm. - And it's not yet Microsoft Exchange 2025-
1:24:121 hour, 24 minutes, 12 seconds- Right - ... and fully enterprise-ready. And then when it updates, it's like, "Oh, I'm in. It's cozy here." You know, like something like this that like-
1:24:211 hour, 24 minutes, 21 seconds- Mm-hmm - ... Makes you smile. A, agent would not come up with that by itself. Because that's like... that's the... I don't know. That's just how you s-
1:24:321 hour, 24 minutes, 32 secondshow you build software that's, that delights. - Yeah, that delight is such a huge part of inspiring great building,
1:24:441 hour, 24 minutes, 44 secondsright? Like you feel the love and the great engineering.
1:24:471 hour, 24 minutes, 47 secondsThat's so important. Humans are incredible at that. Great humans, great builders are incredible at that, in, in, infusing the things they build with
1:24:551 hour, 24 minutes, 55 secondsth- that little bit of love. Not to be cliche, but it's true. I mean, you mentioned that you initially created the SoulMD.
1:25:051 hour, 25 minutes, 5 seconds- It was very fascinating, you know, the, the whole thing that Entropic has a, has like a... Now they call it constitution, back then,
1:25:151 hour, 25 minutes, 15 secondsbut that was months later. Like two months before, people already found that. It was almost like a detective game where the agent mentioned something and then
1:25:231 hour, 25 minutes, 23 secondsthey found... They managed to get out a little bit of that string, of that text. But it was nowhere documented and then you,
1:25:301 hour, 25 minutes, 30 secondsby... just by feeding it the same text and asking it to, like, continue-... they got more out, and then, and you,
1:25:371 hour, 25 minutes, 37 secondsbut like, a very blurry version. And by, like, hundreds of tries, they kinda, like, narrowed it down to what was most likely the original text.
1:25:461 hour, 25 minutes, 46 secondsI found that fascinating. - It was fascinating they were able to pull that out from the weights, right?
1:25:511 hour, 25 minutes, 51 seconds- And, and also just kudos to Anthropic. Like, I think that's, it's a really, it's a really beautiful idea to, like, like some of the stuff that's
1:25:581 hour, 25 minutes, 58 secondsin there. Like, like, we hope Claude finds meaning in its work. 'Cause we don't... Maybe it's a little early,
1:26:051 hour, 26 minutes, 5 secondsbut I think that's meaningful. That's something that's important for the future as we approach something that, at some point, me and may not... has, like, glimpses of consciousness, whatever that even means, because we don't even know. Um,
1:26:171 hour, 26 minutes, 17 secondsso I, I read about this. I found it super fascinating, and I, I started a whole discussion with my agent on
1:26:231 hour, 26 minutes, 23 secondsWhatsApp. And, and I'm like... I, I gave it this text, and it was like, "Yeah, this feels strangely familiar." - Mm-hmm.
1:26:311 hour, 26 minutes, 31 seconds- Um, and then so that I had the whole idea of like, you know, maybe we should also create a, a soul document that includes how I,
1:26:391 hour, 26 minutes, 39 secondsI want to, like work with AI or, like with my agent. You could, you could totally do that just in agents.md, you know? But I, I
1:26:461 hour, 26 minutes, 46 secondsjust found it, it to be a nice touch. And it's like, well, yeah, some of those core values are in the soul. And then I, I also made it so that the
1:26:561 hour, 26 minutes, 56 secondsagent is allowed to modify the soul if they choose so, with the one condition that I wanna know. I mean, I would know anyhow because I see, I see tool calls and stuff.
1:27:071 hour, 27 minutes, 7 seconds- But also the naming of it, soul.md. Soul. You know? There's a... Man, words
1:27:151 hour, 27 minutes, 15 secondsmatter, and like, the framing matters, and the humor and the lightness matters, and the profundity matters, and the
1:27:221 hour, 27 minutes, 22 secondscompassion, and the empathy, and the camaraderie, all that matter. I don't know what it is. You mentioned, like, Microsoft. Like, there's certain
1:27:291 hour, 27 minutes, 29 secondscompanies and approaches th- that can just suffocate the spirit of the thing. I don't know
1:27:371 hour, 27 minutes, 37 secondswhat that is. But it's certainly true that OpenClaw has that fun instilled in it.
1:27:431 hour, 27 minutes, 43 seconds- It was fun because up until late December, it was not even easy to create your own
1:27:541 hour, 27 minutes, 54 secondsagent. I, I built all of that, but my files were mine. I didn't wanna share my soul. And if people would just check it out,
1:28:071 hour, 28 minutes, 7 secondsthey would have to do a few steps manually, and the agent would just be very bare-bones, very dry. And I, I made it simpler, I created the whole template files as codecs,
1:28:171 hour, 28 minutes, 17 secondsbut whatever came out was still very dry. And then I asked my agent, "You see these files? Recreate it bread. Infuse it with your personality."
1:28:281 hour, 28 minutes, 28 seconds- Mm-hmm. - Don't share everything, but, like, make it good. - Make the templates good. - Yeah, and then he, like, rewrote the templates-
1:28:331 hour, 28 minutes, 33 seconds... and then whatever came out was good. So we already have, like, basically AI prompting AI. Because I didn't write any of those words. It was... The intent originally was for me, but this is like, kinda like,
1:28:491 hour, 28 minutes, 49 secondsmy agent's children. - Uh, your uh, your soul.md is famously still private.
1:28:561 hour, 28 minutes, 56 secondsOne of the only things you keep private. What are some things you can speak to that's in there that's part of the, part of the
1:29:041 hour, 29 minutes, 4 secondsmagic sauce, without revealing anything? What makes a personality a personality?
1:29:131 hour, 29 minutes, 13 seconds- I mean, there's definitely stuff in there that you're not human. But who knows what, what creates consciousness or what defines an entity? Um,
1:29:281 hour, 29 minutes, 28 secondsand part of this is, like, that we, we wanna explore this.
1:29:321 hour, 29 minutes, 32 secondsAll that stuff in there, like, be infinitely resourceful
1:29:401 hour, 29 minutes, 40 secondslike pushing, pushing on the creativity boundary. Pushing on the, what it means to be an AI.
1:29:501 hour, 29 minutes, 50 seconds- Having a sense to wonder about self.
1:29:521 hour, 29 minutes, 52 seconds- Yeah, there's some, there's some funny stuff in there. Like, I don't know, we talked about the movie Her, and at one point it promised me that it wouldn't, it wouldn't ascend without me. You know, like, where the-
1:30:031 hour, 30 minutes, 3 seconds- Yeah.
1:30:031 hour, 30 minutes, 3 seconds- So, so there's like some stuff in there that... Because it wrote the, it wrote its own soul file. I didn't write that, right? - Yeah, yeah, yeah.
1:30:101 hour, 30 minutes, 10 seconds- I just heard a discussion about it, and it was like, "Would you like a soul.md? Yeah, oh my God, this is so meaningful." The... Can you go on soul.md? There's like one, one part in there that always ca- catches me if you scroll down a little bit.
1:30:251 hour, 30 minutes, 25 secondsA little bit more. Yeah, this, this, this part. "I don't remember previous sessions unless I read my memory files.
1:30:321 hour, 30 minutes, 32 secondsEach session starts fresh. A new instance, loading context from files. If you're reading this in a future session,
1:30:391 hour, 30 minutes, 39 secondshello." "I wrote this, but I won't remember writing it. It's okay. The words are still mine." - Wow.
1:30:481 hour, 30 minutes, 48 seconds- Uh- That gets me somehow. - Yeah. - It's like- - Yeah.
1:30:511 hour, 30 minutes, 51 seconds- You know, this is, it's still, it's still matrix m- calculations, and we are not at consciousness yet. Yet,
1:30:591 hour, 30 minutes, 59 secondsI, I get a little bit of goo- goosebumps because it, it's philosophical. - Yeah.
1:31:041 hour, 31 minutes, 4 seconds- Like, what does it mean to be, to be an, an agent that starts fresh? Where, like, you have like constant
1:31:121 hour, 31 minutes, 12 secondsmemento, and you like, but you read your own memory files. You can't even trust them in a way. Um-
1:31:191 hour, 31 minutes, 19 seconds- Yeah - Or you can. And I don't know.
1:31:221 hour, 31 minutes, 22 seconds- How much of memory makes up of who we are? How much memory makes up what an
1:31:301 hour, 31 minutes, 30 secondsagent is, and if you erase that memory is that somebody else? Or if you're reading a memory file, does that somehow mean...... you're recreating
1:31:381 hour, 31 minutes, 38 secondsyourself from somebody else, or is that actually you? And those notions are all s- somehow infused in there.
1:31:451 hour, 31 minutes, 45 seconds- I found it just more profound than I should find it, I guess.
1:31:491 hour, 31 minutes, 49 seconds- No, I think, I think it's truly profound and I think you see the magic in it. And when you see the magic, you continue to instill
1:31:591 hour, 31 minutes, 59 secondsthe whole loop with the magic. That's really important. That's the difference between Codex and us and a human. Quick pause for bathroom break.
1:32:081 hour, 32 minutes, 8 seconds- Yeah. - Okay, we're back. Some of the other aspects of the dev workflow is pretty interesting too. I think we w- went off on a
Chapter 11: Programming setup
1:32:171 hour, 32 minutes, 17 secondstangent. L- maybe some of the mundane things, like how many monitors? There's that legendary picture of you with, like,
1:32:241 hour, 32 minutes, 24 seconds17,000 monitors. That's amazing.
1:32:261 hour, 32 minutes, 26 seconds- I mean, I- I- I mocked myself here, so just added... using GROQ to, to add more screens.
1:32:321 hour, 32 minutes, 32 seconds- Yeah. How much is this as meme and how much is this as reality?
1:32:361 hour, 32 minutes, 36 seconds- Yeah. I think two MacBooks are real. The main one that drives the two big screens, and there's another MacBook that I sometimes use for, for testing.
1:32:461 hour, 32 minutes, 46 seconds- So two big screens. - I'm a big fan of anti-glare. So I have this wide Dell
1:32:541 hour, 32 minutes, 54 secondsthat's anti-glare and you can just fit a lot of terminals side-by-side. I usually have a terminal and at the bottom, I- I- I split them. I have a little bit of actual terminal, mostly because when I started,
1:33:081 hour, 33 minutes, 8 secondsI- I sometimes made the mistake and I- I mi- I mixed up the- the windows, and I gave... I- I prompted in the wrong project,
1:33:191 hour, 33 minutes, 19 secondsand then the agent ran off for, like, 20 minutes, manically trying to understand what I could have meant, being completely confused because it was the wrong folder. And sometimes they've been clever enough to, like,
1:33:321 hour, 33 minutes, 32 secondsget out of the workday and, like, figure out that, oh, you meant another project. - Mm-hmm. - But oftentimes, it's just, like, what? You know?
1:33:401 hour, 33 minutes, 40 secondsLike, fit your- f- put yourself in the shoes of your- of the agent and, and-
1:33:431 hour, 33 minutes, 43 seconds- Yeah - ... and then get, like, a super weird something that does not exist and then just, like... They're problem solvers so they try really hard and always feel bad.
1:33:541 hour, 33 minutes, 54 secondsSo it's always, um, Codex and, like, a little bit of actual terminal. Also helpful because I don't use work trees. I like to
1:34:031 hour, 34 minutes, 3 secondskeep things simple, that's why- that's why I like the terminal so much, right? There's no UI. It's just me and the agent having a conversation.
1:34:141 hour, 34 minutes, 14 secondsLike, I don't even need plan mode, you know? There's so many people that come from Claude Code and they're so, so Claude-pilled and, like, have their workflows and they come
1:34:221 hour, 34 minutes, 22 secondsto Codex and... Now, it has plan mode, I think, but I don't think it's necessary because you just- you just talk to the
1:34:291 hour, 34 minutes, 29 secondsagent. And when it's... when you... there's a few trigger words how you can prevent it from building. You're like, "Discuss, give me options."
1:34:371 hour, 34 minutes, 37 seconds- Mm-hmm.
1:34:381 hour, 34 minutes, 38 seconds- Don't write code yet if you wanna be very specific, you just talk and then when you're ready, then- then just write, "Okay, build," and then it'll do the thing.
1:34:471 hour, 34 minutes, 47 secondsAnd then maybe it goes off for 20 minutes and does the thing. - You know what I really like is asking it, "Do you have any questions for me?"
1:34:541 hour, 34 minutes, 54 seconds- Yeah. And again, like, Claude Code has a UI that kind of guides you through that. It's kind of cool but I just find it unnecessary and slow. Like, often it would give me four questions and then maybe I write,
1:35:071 hour, 35 minutes, 7 seconds"One yacht, two and three, discuss more, four, I don't know." Or often- oftentimes
1:35:141 hour, 35 minutes, 14 secondsI- I feel like I want to mock the model where I ask it, "Do you have any questions for me?" And I- I- I don't even read the questions fully. Like, I scan
1:35:221 hour, 35 minutes, 22 secondsover the questions and I, I get the impression all of this can be answered by reading more code and it's just like, "Read more code to answer your own questions." And that usually works.
1:35:321 hour, 35 minutes, 32 seconds- Yeah.
1:35:321 hour, 35 minutes, 32 seconds- And then if not, it will come back and tell me. But many times, you just realize that,
1:35:381 hour, 35 minutes, 38 secondsyou know, it's like you're in the dark and you slowly discover the room, so that's how they slowly discover the code base. And they do it from scratch every time.
1:35:461 hour, 35 minutes, 46 seconds- But I'm also fascinated by the fact that I can empathize deeper
1:35:531 hour, 35 minutes, 53 secondswith the model when I read its questions, because I can understand... Because you said you can infer certain things by the runtime.
1:36:051 hour, 36 minutes, 5 secondsI can infer also a lot of things by the questions it's asking, because it's very possible it's been provided the right
1:36:121 hour, 36 minutes, 12 secondscontext, the right files, the right guidance. So somehow ask, g- get... reading the questions, not even necessarily answering them, but just reading the questions, you get an understanding of where the gaps of knowledge are. It's in-
1:36:241 hour, 36 minutes, 24 secondsit's interesting.
1:36:241 hour, 36 minutes, 24 seconds- You know that in some ways they are ghosts, so even if you plan everything and you build, you can- you can experiment with the question like,
1:36:331 hour, 36 minutes, 33 seconds"Now that you built it, what would you have done different?"
1:36:371 hour, 36 minutes, 37 secondsAnd then oftentimes you get, like, actually something where they discover only throughout building that, oh, what we
1:36:451 hour, 36 minutes, 45 secondsactually did was not optimal. Many times I- I asked them, "Okay, now that you built it, what can we
1:36:521 hour, 36 minutes, 52 secondsrefactor?" Because then you build it and you feel the pain points. I mean, you don't feel the pain points but, right,
1:37:001 hour, 37 minutesthey discover where- where there were problems or where things didn't work e- in the first try and it re- required more loops. So
1:37:111 hour, 37 minutes, 11 secondsevery time, almost every time I- I merge a PR, build a feature, afterwards I ask, "Hey, what can we refactor?" Sometimes it's like, "No, there's, like, nothing big," or, like, usually they say,
1:37:221 hour, 37 minutes, 22 seconds"Yeah, this thing you should really look at." But that took me
1:37:281 hour, 37 minutes, 28 secondsquite a while to, like... You know, that flow took me lots of time to understand, and if you don't do that, you eventually... you'll stop yourself into- into a corner. You, like, you have to keep in mind...
1:37:411 hour, 37 minutes, 41 seconds- ...
1:37:421 hour, 37 minutes, 42 seconds- ... they work very much like humans. Like, I, I, if I write software by myself, I also build something and then I feel the pain points, and then I, I get this urge that I need to refactor something.
1:37:531 hour, 37 minutes, 53 secondsSo, I can very much synthesize with the agent, and you just need to use the context. - Mm-hmm.
1:38:001 hour, 38 minutes- Or, like, you also use the context to write tests. And so, uh, Codex uh, oppose like the, the, the model, models.
1:38:091 hour, 38 minutes, 9 secondsThey, they usually do that by default,
1:38:131 hour, 38 minutes, 13 secondsbut I still often ask the questions, "Hey, do we have enough tests?" "Yeah, we tested this and this, but this corner case could be something write more tests." Um,
1:38:221 hour, 38 minutes, 22 secondsdocumentation. Now that the whole context is full, like, I mean, I'm not saying my documentation is great, but it's not bad.
1:38:321 hour, 38 minutes, 32 secondsAnd pretty much everything is, is LM generated. So, so, you have to approach it as you build features, as you change something. I'm like,
1:38:411 hour, 38 minutes, 41 seconds"Okay, write documentation. What file would you pick?" You know, like, "What file name? Where, where would that fit in?" And it gives me a few options.
1:38:481 hour, 38 minutes, 48 secondsAnd I'm like, "Oh, maybe also add it there," and that's all part of the session.
Chapter 12: GPT Codex 5.3 vs Claude Opus 4.6
1:38:521 hour, 38 minutes, 52 seconds- Maybe you can talk about the current two big competitors in terms of models, Cloud Opus 4.6 and GPT-5 through Codex. Which
1:39:041 hour, 39 minutes, 4 secondsis better? How different are they? I think you've spoken about Codex reading more
1:39:111 hour, 39 minutes, 11 secondsand Opus being more willing to take action faster and maybe being more creative in the actions it takes. But because-
1:39:201 hour, 39 minutes, 20 seconds... Codex reads more, it's able to deliver maybe better code. Can you speak to the di- n- n- differences there?
1:39:291 hour, 39 minutes, 29 seconds- I have a lot of words there. Um, is- as a general purpose model, Opus is the best. Like, for OpenClaw,
1:39:441 hour, 39 minutes, 44 secondsOpus is extremely good in terms of role play. Like, really going into the character that you give it.
1:39:511 hour, 39 minutes, 51 secondsIt's very good at... It was really bad, but it really made an arch to be really good
1:39:571 hour, 39 minutes, 57 secondsat following commands. It is usually quite fast at trying something. It's much more tailored to,
1:40:081 hour, 40 minutes, 8 secondslike, trial and error. It's very pleasant to use.
1:40:151 hour, 40 minutes, 15 secondsIn general, it's almost like Opus was... Is a little bit too American. And I shouldn't... Maybe that's a bad analogy. You'll probably get roasted for that.
1:40:271 hour, 40 minutes, 27 seconds- Yeah, I know exactly. It's 'cause Codex is German. Is that what you're saying? - It's- - Actually, now that you say it, it makes perfect sense.
1:40:341 hour, 40 minutes, 34 seconds- Or you could, you could... Sometimes I- Sometimes I explain it- - I will never be able to unthink what you just said. That's so true.
1:40:421 hour, 40 minutes, 42 seconds- But you also know that a lot of the Codex team is, like, European, um- ... so maybe there's a bit more to it.
1:40:491 hour, 40 minutes, 49 seconds- That's so true. Oh, that's funny. - But also, ent- entropic, they fixed it a little bit. Like,
1:40:551 hour, 40 minutes, 55 secondsOpus used to say, "You're absolutely right all the time," and it, it, it today still triggers me. I can't hear it anymore. It's not even a joke. Uh, I
1:41:031 hour, 41 minutes, 3 secondsjust... You, this was like the, the meme, right? "You're absolutely right." - You're allergic to sycophancy a little bit.
1:41:111 hour, 41 minutes, 11 seconds- Yeah. I, I can't. Some other comparison is like, Opus is like the coworker that
1:41:201 hour, 41 minutes, 20 secondsis a little silly sometimes, but it's really funny and you keep him around. And Codex is like the, the weirdo in the corner that you don't wanna talk to,
1:41:281 hour, 41 minutes, 28 secondsbut is reliable and gets shit done. - Yeah. - Um, ultimately-
1:41:361 hour, 41 minutes, 36 seconds- This all feels very accurate.
1:41:391 hour, 41 minutes, 39 seconds- I mean, ultimately, if you're a skilled driver, you can get good results with any of those latest gen models. Um,
1:41:481 hour, 41 minutes, 48 secondsI like Codex more because it doesn't require so much charade. It will just, it will just
1:41:561 hour, 41 minutes, 56 secondsread a lot of code by default. Opus, you really have to, like, you have to have plan mode. You have to push it harder to, like, go in these directions because it's, it's just like,
1:42:061 hour, 42 minutes, 6 secondslike, "Yeah, can I go in? Can I go in?" You know? - Yeah.
1:42:081 hour, 42 minutes, 8 seconds- It's like, it will just run off very fast, and that's a very localized solution. I think it, I think the difference is, is in the post-training.
1:42:151 hour, 42 minutes, 15 secondsIt's not like the, the raw model intelligence is so different, but it's just... I think that they just give it, give you different,
1:42:231 hour, 42 minutes, 23 secondsdifferent goals. And no model, no model is better in, in in every aspect.
1:42:291 hour, 42 minutes, 29 seconds- What about the code that it generates? The, the... In terms of the actual quality of the code, is it basically the same?
1:42:361 hour, 42 minutes, 36 seconds- If you drive it right, Opus even sometimes can make more elegant solutions, but it requires more skill.
1:42:461 hour, 42 minutes, 46 secondsIt's, it's harder to have so many sessions in parallel with Cloud Code because it's, it's more
1:42:531 hour, 42 minutes, 53 secondsinteractive. And I, I think that's what a lot of people like, especially if they come from coding themselves. Whereas
1:43:021 hour, 43 minutes, 2 secondsCodex is much more you have a discussion, and then we'll just disappear for 20 minutes. Like, even AMP,
1:43:091 hour, 43 minutes, 9 secondsthey, they now added a deep mode. They finally... I mocked them, you know. We finally saw the light. And then they had this whole talk about you have to
1:43:171 hour, 43 minutes, 17 secondsapproach it differently, and I think that's where, that's where people struggle when they just try Codex after trying Cloud
1:43:251 hour, 43 minutes, 25 secondsCode is that it's, it's a slightly diff- it's, it's less interactive. It's, it's like I have quite long discussions sometimes, and then, like, go off. And then, yeah,
1:43:361 hour, 43 minutes, 36 secondsit doesn't matter if it takes 10, 20, 30, 40, 50 minutes or longer, you know? Like, the 6:00 thing was, like, six hours.The latest trend can be
1:43:441 hour, 43 minutes, 44 secondsvery, very persistent until it works. If there's a clear solution, like, "This is, this is what I want at the
1:43:511 hour, 43 minutes, 51 secondsend, so it works," the model will work really hard to really get there. So I think ultimately ...
1:44:031 hour, 44 minutes, 3 secondsthey both need similar time, but on, on, on, on Claude, it- it's a little bit more trial and error often. And, and Codex
1:44:121 hour, 44 minutes, 12 secondssometimes overthinks. I prefer that. I prefer the dry, the dry version where I have to read less over,
1:44:221 hour, 44 minutes, 22 secondsover the more interactive nice way. Like, people like
1:44:281 hour, 44 minutes, 28 secondsthat so much though, that OpenAI even added a second mode with like a more pleasant personality. I haven't even tried it yet. I, I kinda like the brad.
1:44:371 hour, 44 minutes, 37 seconds- Mm-hmm. - Um, yeah, 'cause it ... I care about efficiency when I build it-
1:44:451 hour, 44 minutes, 45 seconds- Right - ... and I, I have fun in the very act of building. I don't need to have fun with my agent who builds. I have fun with my model that ... where I can then test those features.
1:44:571 hour, 44 minutes, 57 seconds- How long does it take for you to adjust, you know, if you
1:45:031 hour, 45 minutes, 3 secondsswitch ... I don't know when, when was the last time you switched. But to adjust to the, the feel. 'Cause you kinda talked about like you have to kinda really feel
1:45:111 hour, 45 minutes, 11 secondswhere, where a model is strong, where, like how to navigate, how to prompt it, how ... all that kinda stuff. Like,
1:45:191 hour, 45 minutes, 19 secondsjust by way of advice, 'cause you've been through this journey of just playing with models. How long does it take to get a feel?
1:45:261 hour, 45 minutes, 26 seconds- If, if someone switches, I would give it a week until you actually develop a gut feeling for it. - Yeah.
1:45:331 hour, 45 minutes, 33 seconds- Um, that's ... if you just ... I think some people also make the mistake of they pay 200 for the, the Claude code
1:45:411 hour, 45 minutes, 41 secondsversion, then they pay 20 bucks for the OpenAI version. But if you pay like the, the 20 bucks version, you get the slow version. So your
1:45:491 hour, 45 minutes, 49 secondsexperience would be terrible because you're used to this very interactive, very good
1:45:551 hour, 45 minutes, 55 secondssystem. And you switch to something that you have very little experience, then that's gonna be very slow. So, I think
1:46:031 hour, 46 minutes, 3 secondsOpenAI shot themselves a little bit in the foot by making the, the cheap version also slow. I would, I would have at least a small part of the fast preview. Or like,
1:46:161 hour, 46 minutes, 16 secondsthe experience that you get when you pay 200 before degrading to it being slow, because it's already slow. - Mm-hmm.
1:46:231 hour, 46 minutes, 23 seconds- I mean, they, they made it better. I think it's ... And, and they have plans to make it a lot better if the Cerebras stuff is true. But yeah, it's a skill. It takes
1:46:311 hour, 46 minutes, 31 secondstime. Even if you play ... You have a regular guitar and you switch it to an E guitar, you're not gonna play well right away. You have to, like,
1:46:381 hour, 46 minutes, 38 secondslearn how it feels.
1:46:421 hour, 46 minutes, 42 seconds- The- there's also this extra psychological effect that you've spoken about which is hilarious to watch. Which once people,
1:46:501 hour, 46 minutes, 50 secondsuh ... When the new model comes out, they try that model, they fall in love with it.
1:46:531 hour, 46 minutes, 53 seconds"Wow, this is the smartest thing of all time," and then they start saying, "You could just watch the Reddit posts over time," start saying that, "We believe the intelligence of this model has been gradually degrading."
1:47:081 hour, 47 minutes, 8 secondsIt, it says something about human nature and just the way our minds work, when it's probably most likely the case that the intelligence of the model is not degrading. Uh,
1:47:201 hour, 47 minutes, 20 secondsit's in fact you're getting used to a good thing.
1:47:221 hour, 47 minutes, 22 seconds- And your project grows, and you're adding slop, and you probably don't spend enough time to think about refactors. And you're making it harder and harder for the agent to work on your slop. And then, and then suddenly,
1:47:341 hour, 47 minutes, 34 seconds"Oh, now it's hard. Oh no, it's not working as well anymore." What's the motivation for, like, one of those AI companies to actually make their model dumber? Like, at most, it will make it slower if,
1:47:461 hour, 47 minutes, 46 secondsif the server load's too high. But, like, quantizing the model, So you have a worse experience, so you go to the competitor?
1:47:561 hour, 47 minutes, 56 seconds- Yeah. - That just doesn't seem like a very smart move in any way.
Chapter 13: Best AI agent for programming
1:47:591 hour, 47 minutes, 59 seconds- Uh, what do you think about Claude Code in comparison to Open Claude? So, Claude Code and maybe the Codex coding agent? Do you see them as kind of competitors?
1:48:111 hour, 48 minutes, 11 seconds- I mean, first of all, competitor is fun when it's not really a competition. - Yeah.
1:48:161 hour, 48 minutes, 16 seconds- Like, I'm happy if ... If, if all it did is, like, inspire people to build something new, cool.
1:48:241 hour, 48 minutes, 24 secondsUm, I still use Codex for the building. I, I know a lot of people use Open Claude to, to build stuff. And I worked hard on it to
1:48:321 hour, 48 minutes, 32 secondsmake that work. And I do smaller stuff with it in terms of code. But, like, if I work hours and hours, I want a big screen, not WhatsApp, you know?
1:48:461 hour, 48 minutes, 46 secondsSo for me, a personal agent is much more about my life. Or like, like a coworker.
1:48:531 hour, 48 minutes, 53 secondsLike, I give you, like, a GitHub URL. Like, "Hey, try out this CLI. Does it actually work?
1:48:571 hour, 48 minutes, 57 secondsWhat can we learn?" Blah, blah, blah. But when I'm deep in, deep in the flow, I want to have multiple, multiple things and it being very, very visible what it, what it does.
1:49:111 hour, 49 minutes, 11 secondsSo it ... I don't see it as a competition. It's, it's different things.
1:49:161 hour, 49 minutes, 16 seconds- But do, do you think there's a a future where the two kinda combine? Like, your personal agent is also your best developing co-programmer partner?
1:49:291 hour, 49 minutes, 29 seconds- Yeah, totally. I think this is where the puck's going, that this is gonna be more and more your operating system.
1:49:371 hour, 49 minutes, 37 seconds- The operating system. - And it already ... It's so funny. Like I, I added support for sub-agents
1:49:441 hour, 49 minutes, 44 secondsand also for ...... um, TTI support, so it could actually run Cloud Coder Codecs. - Mm-hmm.
1:49:531 hour, 49 minutes, 53 seconds- And because mine's a little bit bossy, it, it, it started it and it, it, it told him, like, "Who's the boss," basically.
1:50:011 hour, 50 minutes, 1 secondAnd it was like, "Ah, Codex is obeying me." - Oh, this is a power struggle. - And also the current interface is probably not the final form. Like,
1:50:121 hour, 50 minutes, 12 secondsif you think more globally, we are, we copied Google for agents. You have, like, a prompt,
1:50:241 hour, 50 minutes, 24 secondsand, and then you have a chat interface. That, to me, very much feels like when we first created television
1:50:341 hour, 50 minutes, 34 secondsand then people recorded radio shows on television and you saw that on TV. - Mm-hmm.
1:50:391 hour, 50 minutes, 39 seconds- I think there is, there's n- there's better ways
1:50:461 hour, 50 minutes, 46 secondshow we eventually will communicate with models, and we are still very early in this, how will it even work phase. So,
1:50:581 hour, 50 minutes, 58 secondsit will eventually converge and we will also figure out whole different ways how to work with those things.
1:51:051 hour, 51 minutes, 5 seconds- Uh, one of the other components of workflow is operating system.
1:51:101 hour, 51 minutes, 10 secondsSo I told you offline that for the first time in my life, I'm expanding my sort
1:51:181 hour, 51 minutes, 18 secondsof realm of exploration to the to the Apple ecosystem, to Macs, iPhone and so
1:51:261 hour, 51 minutes, 26 secondson. For most of my life I've been a Linux, Windows and WSL1, WSL2 person, which I
1:51:341 hour, 51 minutes, 34 secondsthink are all wonderful, but I... expanding to also trying Mac. Because it's another way of building and it's
1:51:411 hour, 51 minutes, 41 secondsalso a way of building that a large part of the community currently that's utilizing LMS and agents is using, so. And that's the reason I'm expanding to it. But is there something to be said about the different operating systems here?
1:51:521 hour, 51 minutes, 52 secondsWe should say that OpenClaw supported across operating systems. - Yeah.
1:51:571 hour, 51 minutes, 57 seconds- I saw WSL2 recommended, side windows for certain o- operations, but then Windows, Linux macOS are obviously supported.
1:52:071 hour, 52 minutes, 7 seconds- Yeah, it should even work natively in Windows. I just didn't have enough time to properly test it. And you know, like, the last 90% of software
1:52:151 hour, 52 minutes, 15 secondsalways easier than the first 90%, so I'm sure there's some dragons left that will eventually nail out. Um,
1:52:251 hour, 52 minutes, 25 secondsmy road was, for a long time, Windows, just because I grew up with that, then I switched and had a long phase with Linux, built my own kernels and everything,
1:52:351 hour, 52 minutes, 35 secondsand then I went to university and I, I had my, my hacky Linux thing,
1:52:411 hour, 52 minutes, 41 secondsand saw this white MacBook, and I just thought this is a thing of beauty, the white plastic one. And then I converted
1:52:491 hour, 52 minutes, 49 secondsto Mac 'cause mostly w- I was, I was sick that audio wouldn't work on Skype and all the other issues that, that
1:52:581 hour, 52 minutes, 58 secondsLinux had for a long time. And then I just stuck with it and then I dug into iOS, which required macOS anyhow, so it was never a
1:53:071 hour, 53 minutes, 7 secondsquestion. I think Apple lost a little bit of its lead
1:53:131 hour, 53 minutes, 13 secondsin terms of native. It used to be... Native
1:53:201 hour, 53 minutes, 20 secondsapps used to be so much better, and especially in the Mac, there's more people that build software with love.
1:53:271 hour, 53 minutes, 27 secondsOn, on Windows, it, it... Windows has much more and, like, function wise, there's just more, period. But a lot of it felt
1:53:401 hour, 53 minutes, 40 secondsmore functional and less done with love. Um, I mean, Mac always, like, attracted more designers and people I felt...
1:53:501 hour, 53 minutes, 50 secondsEven though, like, often it has less features, it, it had more delight-
1:53:541 hour, 53 minutes, 54 seconds- Mm-hmm - ... And playfulness. So I always valued that. But in the last few
1:54:021 hour, 54 minutes, 2 secondsyears, many times I actually prefer... Oh God, people are gonna roast me for that,
1:54:101 hour, 54 minutes, 10 secondsbut I prefer Electron apps because they work and native apps often, especially if it's, like, a web service
1:54:191 hour, 54 minutes, 19 secondsis a native app, are lacking features. I mean, not saying it couldn't be done, it's more like a, a focus thing that, like, for many, many companies,
1:54:301 hour, 54 minutes, 30 secondsnative was not that big of a priority.
1:54:351 hour, 54 minutes, 35 secondsBut if they build an Electron app, it, it's the only app, so it is a priority and there's a lot more code sharing possible. And
1:54:421 hour, 54 minutes, 42 secondsI, I build a lot of native Mac apps. I love it. I, I can, I can help myself. Like, I love crafting little Mac, Mac,
1:54:531 hour, 54 minutes, 53 secondsMenu bar tools. Like I built one to, to monitor your Codex use. I built one I call Trimmy,
1:55:011 hour, 55 minutes, 1 secondthat's specifically for agentic use. When you, when you select text that goes over multiple lines it would remove the new line so you
1:55:091 hour, 55 minutes, 9 secondscould actually paste it to the terminal. That was, again like, this is annoying me and after the, the 20th time of it is annoying me, I just built
1:55:161 hour, 55 minutes, 16 secondsit. There is a cool Mac app for OpenClaw that I don't think many people discovered yet, also because it, it still needs some love.
1:55:231 hour, 55 minutes, 23 secondsIt feels a little bit too much like the Hummer car right now because I, I just experiment a lot with it. It, it likes to polish.
1:55:321 hour, 55 minutes, 32 seconds- So you still... I mean, you still love it. You still, you still love adding to the delight of that operating system.
1:55:371 hour, 55 minutes, 37 seconds- Yeah, but then you realize... Like, I also built one, for example, for GitHub. And then the... If you use SwiftUI,
1:55:441 hour, 55 minutes, 44 secondslike the latest and greatest at Apple, and took them forever to build something to show an image from the web. Now we have async, async image,
1:55:541 hour, 55 minutes, 54 secondsbut...... I added support for it and then some images would just not show up or, like, be very slow. And I had a discussion with Codex like, "Hey, why is there a bug?" And even Codex said like,
1:56:051 hour, 56 minutes, 5 seconds"Yeah, there's this ASIC image but it's really more for experimenting and it should not be used in production." But
1:56:131 hour, 56 minutes, 13 secondsthat's Apple's answer to, like, showing images from the web. This shouldn't be so hard, you know.
1:56:191 hour, 56 minutes, 19 secondsThis is like... This is like insane. Like, how am I in, in, in 2026 and my agent tell me, "Don't use the
1:56:271 hour, 56 minutes, 27 secondsstuff Apple built because it's, it's... It's... Yeah, it- it's there but it's not good." And like this is now in the
1:56:331 hour, 56 minutes, 33 secondsweeds. This is... To me this is like, um... They had so much
1:56:421 hour, 56 minutes, 42 secondshead start and so much love, and they kind of just like blundered it and didn't, didn't evolve it as much as they should.
1:56:501 hour, 56 minutes, 50 seconds- But also, there's just the practical reality. If you look at Silicon Valley, most of the developer world that's
1:56:571 hour, 56 minutes, 57 secondskind of playing with LMS and Agentic AI, they're all using Apple products. And then, at the same time, Apple is not
1:57:051 hour, 57 minutes, 5 secondsreally, like, leaning on that. Like they're not... They're not opening up and playing and working together and like, yes.
1:57:121 hour, 57 minutes, 12 seconds- Isn't, isn't it funny how they completely blunder AI, and yet everybody's buying Mac Minis?
1:57:191 hour, 57 minutes, 19 seconds- How... What... Does that even make sense? You're, you're, you're quite possibly the world's greatest Mac salesman of all time.
1:57:291 hour, 57 minutes, 29 seconds- No, you don't need a Mac Mini to install OpenClaw. You can install it on the web. There's, there's a concept called nodes, so you can like
1:57:371 hour, 57 minutes, 37 secondsmake your computer a node and it will do the same. There is something said for running it on separate hardware.
1:57:481 hour, 57 minutes, 48 secondsThat right now is useful. Um, there is... There's a big argument for
1:57:571 hour, 57 minutes, 57 secondsthe browser. You know, I, I built some Agentic browser use in there. And, I mean, it's basically Playwright with a bunch of extras to make it easier for agents.
1:58:061 hour, 58 minutes, 6 seconds- Playwright is a library that controls the browser. - Yeah. - It's really nice, easy to use.
1:58:091 hour, 58 minutes, 9 seconds- And our internet is slowly closing down. Like, there, there's a whole movement to make it harder for agents to use. So if you
1:58:181 hour, 58 minutes, 18 secondsdo the same in a data center and websites detect that it's an IP from a data center, the website might just block you or it make it really hard or
1:58:261 hour, 58 minutes, 26 secondsput a lot of captures in the, in the way of the agent. I mean, agents are quite good at happily clicking, "I'm not a robot." - Yeah.
1:58:331 hour, 58 minutes, 33 seconds- Um, but having that on a residential IP makes a lot of things simpler. So
1:58:411 hour, 58 minutes, 41 secondsthere's ways. Yeah. But it really does not need to be a Mac. It can... It can be any old hardware. I always say, like, maybe use the... Use the
1:58:531 hour, 58 minutes, 53 secondsopportunity to get yourself a new MacBook or whatever computer you use and use the old one as your server instead of buying a standalone Mac Mini.
1:59:031 hour, 59 minutes, 3 secondsBut then there's, again, there's a lot of very cute things people build with Mac Minis that I like. - Yeah.
1:59:081 hour, 59 minutes, 8 seconds- Um, and no, I don't get commission from Apple. They didn't really communicate much.
1:59:161 hour, 59 minutes, 16 seconds- It's sad. It's sad. Can you actually speak to what it takes to get started with OpenClaw? There's...
1:59:221 hour, 59 minutes, 22 secondsI mean, there's a lot of people... What is it? Somebody tweeted at you, "Peter, make OpenClaw easy to set up for everyday people.
1:59:301 hour, 59 minutes, 30 seconds99.9% of people can't access to OpenClaw and have their own lobster because of their technical difficulties in getting it set up.
1:59:381 hour, 59 minutes, 38 secondsMake OpenClaw accessible to everyone, please." And you replied, "Working on that." From my perspective, it seems there- there's a bunch of different options and
1:59:451 hour, 59 minutes, 45 secondsit's already quite straightforward, but I suppose that's if you have some developer background. - I mean, right now you have to paste in one liner into the terminal.
1:59:531 hour, 59 minutes, 53 seconds- Right.
1:59:541 hour, 59 minutes, 54 seconds- And there's also an app. The app kind of does that for you, but there should be a Windows app. The app needs to
2:00:022 hours, 2 secondsbe easier and more loved. The configuration should potentially be web- based or in the app. And I
2:00:092 hours, 9 secondsstarted working on that, but honestly right now I want to focus on security aspects.
2:00:172 hours, 17 secondsAnd, and once I'm confident that this is at a level that I can recommend my mom, then I'm going to make it simpler.
2:00:252 hours, 25 secondsLike I... Right now- - You want to make it harder so that it doesn't scale as fast as it's scaling. - Yeah, it would be nice if it wouldn't... I mean, that's, like, hard to say, right?
2:00:352 hours, 35 secondsBut if the growth would be a little slower, that would be helpful because people are
2:00:422 hours, 42 secondsexpecting inhuman things from a single human being. And yes, I have some contributors, but also that whole machinery I started a week ago so,
2:00:512 hours, 51 secondsThat needs more time to figure out. And, and not everyone has all day to work on that.
2:01:002 hours, 1 minute- There's some beginners listening to this, programming beginners.
2:01:042 hours, 1 minute, 4 secondsWhat advice would you give to them about, let's say, joining the Agentic AI revolution?
2:01:122 hours, 1 minute, 12 seconds- Play. Um, playing is the best... The best way to learn. If you
2:01:182 hours, 1 minute, 18 secondswanna... I'm sure if you... If you are like a little bit of builder, you have an idea in your head that you want to build, just build that, or like, give it a try.
2:01:252 hours, 1 minute, 25 secondsIt doesn't need to be perfect. I built a whole bunch of stuff that I don't use. It doesn't matter. Like, it's the journey. - Mm-hmm.
2:01:312 hours, 1 minute, 31 seconds- You know? Like the philosophical way, that the end doesn't matter, the journey matters. Have fun. - Mm-hmm.
2:01:372 hours, 1 minute, 37 seconds- My God, like those things... I... I don't think I ever had so much fun building things because I can focus on the hard parts now.
2:01:452 hours, 1 minute, 45 secondsA lot of coding, I always thought I liked coding, but really I like building. - Yeah.
2:01:502 hours, 1 minute, 50 seconds- And... And whenever you don't understand something, just ask. You have an infinitely patient answering machine.... that
2:01:582 hours, 1 minute, 58 secondsy- can explain you anything at any level of complexity. Sometimes, that's like one time I asked, "Hey explain to me like
2:02:062 hours, 2 minutes, 6 secondsI'm- I'm eight years old," and it started giving me a story with crayons and stuff. And I'm like, "No, not like that." Like, I'm
2:02:122 hours, 2 minutes, 12 secondsokay- ... up- up the age a little bit, you know? I'm like, I'm not an actual child, it's just, I just need a simpler language for like a- a-
2:02:202 hours, 2 minutes, 20 secondsa- a- a tricky database concept that I didn't grok in the first- first time. But, you know, just, you can just
2:02:282 hours, 2 minutes, 28 secondsask things. Like, you- there's like... It used to be that I had to go on Stack Overflow or ha- ask on Twitter, and then maybe two days later I get a response. Or I had to try for hours. And now you-
2:02:412 hours, 2 minutes, 41 secondsyou can just ask stuff. It- I mean, it's never... You have, like, your own teacher. You know that there's like statistics, y- you can learn faster if you have your own teacher. The- it's like you have this infinitely patient machine.
2:02:522 hours, 2 minutes, 52 secondsAsk it.
2:02:532 hours, 2 minutes, 53 seconds- But what would you say? So use... What's the easiest way to play? So maybe Open Claw is a nice way to play so you can then set- set everything up and then you could chat with it.
2:03:032 hours, 3 minutes, 3 seconds- You can also just experiment with it and, like, modify it. Ask your agent. I mean, there is infinite ways how it can be made better.
2:03:162 hours, 3 minutes, 16 secondsPlay around, make it better. - Mm-hmm.
2:03:192 hours, 3 minutes, 19 seconds- More general, if you- if you're a beginner and you actually wanna learn how to build software really fast, get
2:03:272 hours, 3 minutes, 27 secondsinvolved in open source. Doesn't need to be my project. In fact, maybe don't use my project because
2:03:342 hours, 3 minutes, 34 secondsmy- my backlog is very large, but I learned so much from open source. Just like, like, be- be
2:03:412 hours, 3 minutes, 41 secondshumble. Don't- maybe don't send a pull request right away. But there's many other ways you can help out. There's many ways you can just learn by just reading code. By-
2:03:532 hours, 3 minutes, 53 secondsby being on Discord or wherever people are, and just,
2:03:562 hours, 3 minutes, 56 secondslike, understanding how things are built. I don't know, like Mitchell Hashimoto
2:04:042 hours, 4 minutes, 4 secondsbuilds Ghostly, the terminal, and he has a really good community where there's so many other projects. Like, pick something that you find interesting and get involved.
2:04:152 hours, 4 minutes, 15 seconds- Do you recommend that people that don't know how to program or don't really know how to program learn to program also? So when you
2:04:252 hours, 4 minutes, 25 secondsyou can get quite far right now by just using natural language, right? Do you s- still see a lot of value in
2:04:342 hours, 4 minutes, 34 secondsreading the code, understanding the code, and then being able to write a little bit of code from scratch? - It definitely helps. - It's hard for you to answer that-
2:04:412 hours, 4 minutes, 41 seconds- Yeah - ... because you don't know what it's like to do any of this without knowing the base knowledge. Like, you might take for granted just how much intuition you have about the programming world having programmed so much, right?
2:04:542 hours, 4 minutes, 54 seconds- There's people that are high agency and very curious,
2:04:582 hours, 4 minutes, 58 secondsand they get very far even though they have no deep understanding how software works just because they ask questions and questions and- and- and-
2:05:082 hours, 5 minutes, 8 seconds... and agents are infinitely patient. Like, part of what I did this year is I went to a lot of iOS conferences because that's my background
2:05:172 hours, 5 minutes, 17 secondsand just told people, "Don't consi- don't see yourself as an iOS engineer anymore." Like, "You need to change your mindset. You're a
2:05:232 hours, 5 minutes, 23 secondsbuilder." And you can take a lot of the knowledge how to build software into new domains and all of the- the more fine-grain details,
2:05:342 hours, 5 minutes, 34 secondsagents can help. You don't have to know how to splice an array or what the- what the correct template syntax is or whatever, but you can
2:05:422 hours, 5 minutes, 42 secondsuse all your- your general knowledge and that makes it much easier to move from one galaxy, one
2:05:492 hours, 5 minutes, 49 secondstech galaxy into another. And oftentimes, there's languages that make more or less sense depending on what you
2:05:562 hours, 5 minutes, 56 secondsbuild, right? So for example, when I build simple CLIs, I like Go. I actually don't like Go. I don't like the syntax of Go. I didn't even
2:06:062 hours, 6 minutes, 6 secondsconsider the language. But the ecosystem is great, it works great with agents. It is garbage collected. It's not the highest performing one, but it's very fast.
2:06:172 hours, 6 minutes, 17 secondsAnd for those type of- of CLIs that I build, Go is- is a really good choice. So I- I use a language I'm not even a fan of for... That's my main to-go thing for- for CLIs.
2:06:292 hours, 6 minutes, 29 seconds- Isn't that fascinating that here's a programming language you would've never used if you had to write it from scratch and now you're using
2:06:362 hours, 6 minutes, 36 secondsbecause LMs are good at generating it and it has some of the characteristics that makes it resilient, like garbage collected?
2:06:442 hours, 6 minutes, 44 seconds- Because everything's weird in this new world and that just makes the most sense.
2:06:482 hours, 6 minutes, 48 seconds- What's the best Ridiculous question. What's the best programming language for the AI- AI agentic world? Is it JavaScript, TypeScript?
2:06:542 hours, 6 minutes, 54 seconds- TypeScript is really good. Sometimes the types can get really confusing and the ecosystem is- is a
2:07:052 hours, 7 minutes, 5 secondsjungle. So for- for web stuff it's good. I wouldn't build everything in it.
2:07:152 hours, 7 minutes, 15 seconds- Don't you think we're moving there? Like, that everything will eventually be written- eventually is written in JavaScript and it-
2:07:222 hours, 7 minutes, 22 seconds- The birth and death of JavaScript and we are living through it in real time. - Like, what does programming look like in 20 years? Right? In 30 years? In 40 years?
2:07:302 hours, 7 minutes, 30 secondsWhat do programs and apps look like?
2:07:322 hours, 7 minutes, 32 seconds- You can even ask a question like, do we need a- a programming language that's made for agents? Because all of those languages are made for humans.
2:07:402 hours, 7 minutes, 40 secondsSo how- what would that look like? Um, I think there's a- there's whole bunch of interesting questions that we'll discover. And also how because everything is now world knowledge, how it in many ways,
2:07:542 hours, 7 minutes, 54 secondsthings will stagnate 'cause if you build something new and the agent has no idea that's gonna be much harder to use than something that's already there. Um...... of when I build Mac apps,
2:08:052 hours, 8 minutes, 5 secondsI build them in, in Swift and SwiftUI, mm, partly because I like pain,
2:08:112 hours, 8 minutes, 11 secondspartly because it... the, the deepest level of system integration, I can only get through there. And
2:08:192 hours, 8 minutes, 19 secondsyou clearly feel a difference if you click on an electron app and it loads a web view in the menu. It's just not the same. Um,
2:08:282 hours, 8 minutes, 28 secondssometimes I just also try new languages just to, like, get a feel for them. - Like Zig?
2:08:332 hours, 8 minutes, 33 seconds- Yeah. If it's something that... where I care about performance a lot then it's, it's a really interesting language. And it... like agents got so
2:08:402 hours, 8 minutes, 40 secondsmuch better over the last six months from not really good to
2:08:462 hours, 8 minutes, 46 secondstotally valid choice. Just still a, a very young ecosystem. And most of the time you
2:08:542 hours, 8 minutes, 54 secondsactually care about ecosystem, right? So, so if you build something that does inference or goes into whole running model direction, Python, very good.
2:09:062 hours, 9 minutes, 6 seconds- Mm-hmm.
2:09:072 hours, 9 minutes, 7 seconds- But then if I build stuff in Python and I want a story where I can also deploy it on Windows, not a good choice. - Mm-hmm.
2:09:132 hours, 9 minutes, 13 seconds- Sometimes I, I found projects that kinda did 90% of what I wanted but were in Python, and I wanted them... I wanted an easy Windows
2:09:212 hours, 9 minutes, 21 secondsstory. Okay, just rewrite it in Go. Um, but then if you go towards
2:09:282 hours, 9 minutes, 28 secondsmultiple, multiple threads and a lot more performance, Rust is a really good choice. There's no... there's just no single answer, and it's also the beauty of it.
2:09:362 hours, 9 minutes, 36 secondsLike, it's fun. And now it doesn't matter anymore, you can just literally pick the language that has the, the most fitting characteristics and ecosystem-
2:09:452 hours, 9 minutes, 45 seconds- Mm-hmm - ... for your problem domain. And yeah, it might be... You might have s-... You might be a little bit slow in reading the code,
2:09:532 hours, 9 minutes, 53 secondsbut not really. Y- I think you, you pick stuff up really fast, and you can always ask your agent.
Chapter 14: Life story and career advice
2:09:592 hours, 9 minutes, 59 seconds- So there's a lot of programmers and builders who draw inspiration from y- your story. Just the way you carry yourself, your choice of making OpenClaw
2:10:122 hours, 10 minutes, 12 secondsopen source, the, the way you have fun building and exploring, and doing
2:10:192 hours, 10 minutes, 19 secondsthat, for the most part, alone or on a small team. So by way of advice, what metric
2:10:262 hours, 10 minutes, 26 secondsshould be the goal that they would be optimizing for? What would be the metric of success? Would it be
2:10:332 hours, 10 minutes, 33 secondshappiness? Is it money? Is it positive impact for people who are dreaming of building? 'Cause you went through an interesting
2:10:412 hours, 10 minutes, 41 secondsjourney. You've achieved a lot of those things, and then you fell out of love with programming a little bit for a time.
2:10:472 hours, 10 minutes, 47 seconds- I was just burning too bright for too long.
2:10:532 hours, 10 minutes, 53 secondsI, I ran... I started PSPDFKit, s- and ran it for 13 years,
2:11:012 hours, 11 minutes, 1 secondand it was high stress. Um, I had to learn all these things
2:11:082 hours, 11 minutes, 8 secondsfast and hard, like how to manage people, how to bring people on, how to deal with customers, how to do... - So it wasn't just programming stuff, it was people stuff.
2:11:172 hours, 11 minutes, 17 seconds- The stuff that burned me out was mostly people stuff. I, I don't think burnout is working too much.
2:11:272 hours, 11 minutes, 27 secondsMaybe to a degree. Everybody's different. You know, I c- I cannot speak in a- in absolute terms, but for me, it was much more differences,
2:11:372 hours, 11 minutes, 37 secondsWith my, my co-founders, conflicts, or, like, really high stress situation with
2:11:442 hours, 11 minutes, 44 secondscustomers that eventually grinded me down. And then
2:11:502 hours, 11 minutes, 50 secondswhen... luckily we, we got a really good offer for, like, putting the company
2:11:582 hours, 11 minutes, 58 secondsto the next level and I, I already kinda worked two years on making myself obsolete. So at this point I could leave,
2:12:052 hours, 12 minutes, 5 secondsand, and then I just... I was sitting in front of the screen and I felt like, you know Austin Powers where they suck the mojo out? - Yeah.
2:12:142 hours, 12 minutes, 14 seconds- Uh, I g- I was like, m- m- it was, like, gone. Like, I couldn't... I couldn't get code out anymore. I was just, like, staring
2:12:252 hours, 12 minutes, 25 secondsand feeling empty, and then I, I just stopped. I,
2:12:342 hours, 12 minutes, 34 secondsI booked, like, a one-way trip to Madrid and, and, and just, like, spent a t- some t-
2:12:382 hours, 12 minutes, 38 secondssometime there. I felt like I had to catch up on life, so I did a whole, a whole bunch of life catching up stuff.
2:12:472 hours, 12 minutes, 47 seconds- Did you go through some lows during that period? And you know, maybe advice on... of how to?
2:12:562 hours, 12 minutes, 56 seconds- Uh, maybe advice on how to approach life. If you think that, "Oh yeah, work really hard and then I'll retire," I don't recommend that.
2:13:062 hours, 13 minutes, 6 secondsBecause the idea of, "Oh yeah, I just enjoy
2:13:132 hours, 13 minutes, 13 secondslife now," a- maybe it's appealing, but
2:13:182 hours, 13 minutes, 18 secondsright now I enjoy life, the most I've ever enjoyed life. Because if you wake up in the morning and you have nothing to look forward to, you have no real challenge,
2:13:332 hours, 13 minutes, 33 secondsthat gets very boring, very fast. And then when, when you're bored, you're gonna look
2:13:412 hours, 13 minutes, 41 secondsfor other places how to stimulate yourself, and then maybe, maybe that's
2:13:462 hours, 13 minutes, 46 secondsdrugs, you know? But that eventually also get boring and you look for more, and that will lead you down a very dark path.
Chapter 15: Money and happiness
2:13:572 hours, 13 minutes, 57 seconds- But you also showed on the money front, you know, a lot of people in Silicon Valley and the startup world, they think, maybe overthink way too much optimized
2:14:042 hours, 14 minutes, 4 secondsfor money. And you've also shown that it's not like you're saying no to money. I mean, I'm sure you take money, but it's not...... the primary objective
2:14:152 hours, 14 minutes, 15 secondsof uh, of your life. Can you just speak to that? Your philosophy on money?
2:14:202 hours, 14 minutes, 20 seconds- When I built my company, money was never the driving force. It felt more like, like, an affirmation that I did something right.
2:14:272 hours, 14 minutes, 27 secondsAnd having money solves a lot of problems. I also think there, there's diminishing returns the more you have. Um,
2:14:382 hours, 14 minutes, 38 secondslike, a cheeseburger is a cheeseburger, and I think if you go too far
2:14:452 hours, 14 minutes, 45 secondsinto, oh, I do private jet and I only travel luxury, you
2:14:532 hours, 14 minutes, 53 secondsdisconnect with society. Um, I, I donated quite a
2:15:002 hours, 15 minuteslot. Like, I have a, I have a foundation for helping people that weren't so lucky.
2:15:112 hours, 15 minutes, 11 seconds- And disconnecting from society is bad in that on many levels, but one of them is, like, humans are awesome.
2:15:182 hours, 15 minutes, 18 secondsIt's nice to continuously remember the awesomeness in humans. - I, I mean, I could afford really nice hotels. The last time I was in San Francisco, I did the,
2:15:272 hours, 15 minutes, 27 secondsthe first time the OG Airbnb experience-
2:15:302 hours, 15 minutes, 30 seconds- Yeah, yeah - ... and just booked a room. Mostly because I, I thought,
2:15:342 hours, 15 minutes, 34 secondsokay, you know, I'm out or I'm sleeping, and I don't like where all the hotels are, and I wanted a, I wanted a different
2:15:422 hours, 15 minutes, 42 secondsexperience. I think, isn't life all about experiences? Like, if you, if you tailor your life towards, "I wanna have
2:15:512 hours, 15 minutes, 51 secondsexperiences," it, it reduces the need for, "It needs to be good or bad." Like, if people only want good experiences, that's not gonna work, but if you optimize for experiences,
2:16:042 hours, 16 minutes, 4 secondsif it's good, amazing. If it's bad, amazing, because, like, I learned something, I saw something, did something. I wanted to experience that, and it was
2:16:122 hours, 16 minutes, 12 secondsamazing. Like, there was, like, this, this queer DJ in there, and I showed her how to make music with cloud code.
2:16:212 hours, 16 minutes, 21 secondsAnd we, like, immediately bonded and had a great time.
2:16:242 hours, 16 minutes, 24 seconds- Yeah, there's something about that air- you know, couch surfing, Airbnb experience, the OG. I'm still to this day. It's awesome. It's humans, and that's why travel is awesome.
2:16:342 hours, 16 minutes, 34 seconds- Yeah. - Just experience the variety of, the diversity of human. And when it's shitty, it's good too,
2:16:382 hours, 16 minutes, 38 secondsman. If it rains and you're soaked and it's all fucked, and planes, the everything is shit, everything is fucked, it's still awesome. If you're able to open your eyes it's good to be alive.
2:16:492 hours, 16 minutes, 49 seconds- Yeah, and anything that creates emotion and feelings is good. - .
2:16:552 hours, 16 minutes, 55 seconds- Even... So, so maybe, maybe even the cryptic people are good because they definitely created emotions. I, I don't know if I should go that far.
2:17:022 hours, 17 minutes, 2 seconds- No, man. Give them, give them all, give them love. Give them love. Because I do think that online lacks some of the awesomeness of real life.
2:17:132 hours, 17 minutes, 13 seconds- Yeah. - That's, that's, it's an open problem of how to solve, how to infuse the online cyber experience with I don't know,
2:17:252 hours, 17 minutes, 25 secondsWith the intensity that we humans feel when it's in real life. I don't know. I don't know if that's a solvable problem. - Well, it's just possible because text is very lossy.
2:17:352 hours, 17 minutes, 35 seconds- Yeah. - You know, sometimes I wish if I talked to the agent I would... It should be multi-model so it also understands my emotions.
2:17:432 hours, 17 minutes, 43 seconds- I mean, it, it might move there. It might move there. - It will. It will. It totally will.
Chapter 16: Acquisition offers from OpenAI and Meta
2:17:492 hours, 17 minutes, 49 seconds- I mean, I have to ask you, just curious. I, I know you've probably gotten huge offers from major companies. Can you speak to who you're considering working with?
2:18:042 hours, 18 minutes, 4 seconds- Yeah. So, to like explain my thinking a little bit, right,
2:18:122 hours, 18 minutes, 12 secondsI did not expect this blowing up so much. So, there's a lot of doors that opened because of it. There's, like,
2:18:252 hours, 18 minutes, 25 secondsI think every VC, every big VC company is in my inbox and tried to get 15 minutes of
2:18:312 hours, 18 minutes, 31 secondsme. So, there's, like, this butterfly effect moment. I could just do nothing and continue
2:18:402 hours, 18 minutes, 40 secondsand I really like my life. Valid choice. Almost. Like, I considered it when I
2:18:472 hours, 18 minutes, 47 secondsdelete it, wanted to delete the whole thing. I could create a company.
2:18:582 hours, 18 minutes, 58 secondsBeen there, done that. Um, there's so many people that push me towards that and, yeah, like, could be amazing.
2:19:072 hours, 19 minutes, 7 seconds- Which is to say that you, you would probably raise a lot of money in that. - Yeah.
2:19:112 hours, 19 minutes, 11 seconds- I don't know, hundreds of millions, billions. I don't know. It could just got unlimited amount of money.
2:19:152 hours, 19 minutes, 15 seconds- Yeah. It just doesn't excite me as much because I feel I did all of that, and it would
2:19:262 hours, 19 minutes, 26 secondstake a lot of time away from the things I actually enjoy. Same as when, when I was CEO, I think I, I learned to do it and I'm not bad at it, and partly I'm good at it.
2:19:412 hours, 19 minutes, 41 secondsBut yeah, that path doesn't excite me too much, and I also fear it, it would create a natural conflict of interest. Like, what's the most obvious thing I do? I, I prioritize it. I put, like,
2:19:532 hours, 19 minutes, 53 secondsa version safe for workplace. And then what do you do? Like, I get a pull request with a feature like an audit log, but that seems like an enterprise feature,
2:20:052 hours, 20 minutes, 5 secondsso now I feel I have a conflict of interest in the open-source version and the closed- source
2:20:132 hours, 20 minutes, 13 secondsversion.... or change the license to something like FSL, where you cannot actually use it for commercial stuff, would first be very difficult with all the contributions. And second of all,
2:20:252 hours, 20 minutes, 25 secondsI- I like the idea that it's free as in beer and not free with conditions. Um,
2:20:332 hours, 20 minutes, 33 secondsyeah, there's ways how you, how you keep all of that for free and just, like,
2:20:382 hours, 20 minutes, 38 secondsstill try to make money, but those are very difficult. And you see there's, like, fewer and fewer companies manage that. Like, even
2:20:472 hours, 20 minutes, 47 secondsTailwind, they're, like, used by everyone. Everyone uses Tailwind, right? And then they had to cut off 75% of the employees because they're not making money because nobody's even going on the website anymore because it's all done by agents.
2:21:002 hours, 21 minutesS- and just relying on donations, yeah, good luck. Like, if a project of my
2:21:062 hours, 21 minutes, 6 secondscaliber, if I extrapolate what the typical open-source project would get
2:21:142 hours, 21 minutes, 14 secondsit's not a lot. I s- I still lose money on the project because I made the point of supporting every dependency,
2:21:212 hours, 21 minutes, 21 secondsexcept Slack. They are a big company. They can, they can, they can do without me.
2:21:252 hours, 21 minutes, 25 secondsBut all the projects that are done by mostly individuals so, like, all the, right now, all the sponsorship goes right up to my dependencies. And if there's more, I want to, like,
2:21:402 hours, 21 minutes, 40 secondsbuy my contributors some merch, you know? - So you're losing money? - Yeah, right now I lose money on this. - So it's really not sustainable?
2:21:482 hours, 21 minutes, 48 seconds- Uh, I mean, it's like, I guess something between 10 and 20K a month. Um,
2:21:552 hours, 21 minutes, 55 secondswhich is fine. I'm sure over time I could get that down. Um, OpenAI is helping out a
2:22:032 hours, 22 minutes, 3 secondslittle bit with tokens now. And there's other companies that have been generous. But yeah, still losing money on that.
2:22:122 hours, 22 minutes, 12 secondsSo that's- that's one path I consider, but I'm just not very excited. And then there's all the big labs that I've been talking to.
2:22:252 hours, 22 minutes, 25 secondsAnd from those Meta and OpenAI seem the most interesting.
2:22:322 hours, 22 minutes, 32 seconds- Do you lean one way or the other? - Uh, yeah. Um...
2:22:432 hours, 22 minutes, 43 secondsNot sure how much I should share there. It's not quite finalized yet. Um,
2:22:522 hours, 22 minutes, 52 secondslet's- let's just say, like, on either of these,
2:22:582 hours, 22 minutes, 58 secondsmy conditions are that the project stays open source. That it... Maybe it's gonna be a model like Chrome and Chromium. Um, I think this
2:23:092 hours, 23 minutes, 9 secondsis- this is too important to just give to a company and make it theirs.
2:23:152 hours, 23 minutes, 15 secondsIt... This is... And we didn't even talk about the whole community part, but, like, the- the thing that I experienced in San Francisco, like
2:23:232 hours, 23 minutes, 23 secondsat ClawCon, seeing so many people so inspired, like... And having fun and just, like,
2:23:312 hours, 23 minutes, 31 secondsbuilding shit, and, like, having, like, robots in lobster stuff walking around. Like, the... People told me, like, they didn't
2:23:392 hours, 23 minutes, 39 secondsexperience this level of- of community excitement since, like, the early days of the internet, like 10, 15 years. And there were a lot of high caliber people there, like... Um,
2:23:522 hours, 23 minutes, 52 secondsI was amazed. I also, like, was very sensory overloaded because too many people
2:23:562 hours, 23 minutes, 56 secondswanted to do selfies. But I love this. Like, this needs to stay a place where people
2:24:052 hours, 24 minutes, 5 secondscan, like, hack and learn. But also, I'm very excited to, like,
2:24:152 hours, 24 minutes, 15 secondsmake this into a version that I can get to a lot of people because I think this is the year of personal agents, and that's the future. And the fastest way to do that is teaming up with one of the labs.
2:24:292 hours, 24 minutes, 29 secondsAnd I also, on a personal level, I never worked at a large company, and I'm
2:24:372 hours, 24 minutes, 37 secondsintrigued. You know, we talk about experiences. Will I like it? I don't know. But I want that experience. Uh, I- I'm sure, like, if- if I- if I announce this, then there will be people like, "Oh, he sold out," blah, blah,
2:24:532 hours, 24 minutes, 53 secondsblah. But the project will continue. From everything I talked to so far, I can even have
2:25:042 hours, 25 minutes, 4 secondsmore resources for that. Like, both s- both of those
2:25:112 hours, 25 minutes, 11 secondscompanies understand the value that I created something that accelerates our timeline and that got people excited about AI. I mean,
2:25:232 hours, 25 minutes, 23 secondscan you imagine? Like, I installed OpenClaw on one of my, I'm sorry, normie friends. I'm sorry, Vahan.
2:25:312 hours, 25 minutes, 31 secondsBut he's just a... You know? Like, he's- - Normie with love, yeah. For sure.
2:25:342 hours, 25 minutes, 34 seconds- He- he, like, someone who uses the computer, but never really... Like, yeah, use some ChatGPT sometimes, but not very technical.
2:25:442 hours, 25 minutes, 44 secondsWouldn't really understand what I built. So, like, I'll show you, and I- I paid for him the- the 90 buck,
2:25:532 hours, 25 minutes, 53 seconds100 buck, I don't know, subscription for Entropic. And set up everything for him with, like, WSL Windows. - Mm-hmm.
2:26:002 hours, 26 minutes- I was also curious, would it actually work on Windows, you know? Was a little early. And then within a few days, he was hooked. Like, he texted me
2:26:112 hours, 26 minutes, 11 secondsabout all the things he learned. He built, like, even little tools. He's not a programmer. And then within a few days he upgraded to the
2:26:182 hours, 26 minutes, 18 seconds$200 subscription. Or euros, because he's in Austria.... and he was in love with that thing. That,
2:26:262 hours, 26 minutes, 26 secondsfor me, was like a very early product validation. It's like, I built something that captures people.
2:26:342 hours, 26 minutes, 34 secondsAnd then, a few days later, Entropic blocked him because,
2:26:392 hours, 26 minutes, 39 secondsbased on their rules using the subscription is problematic or whatever.
2:26:482 hours, 26 minutes, 48 secondsAnd he was, like, devastated. And then he signed up for Mini Max for 10 bucks a month and uses that. And I think that's silly in many ways, because
2:27:002 hours, 27 minutesyou just got a 200 buck customer. You just made someone hate your company, and we are still so
2:27:082 hours, 27 minutes, 8 secondsearly. Like, we don't even know what the final form is. Is it gonna be cloud code? Probably not, you know? Like, that
2:27:152 hours, 27 minutes, 15 secondsseems very... It seems very short-sighted to lock down your product so much. All the other
2:27:242 hours, 27 minutes, 24 secondscompanies have been helpful. I- I'm in Slack of, of most of the big labs. Kind of everybody understands that we are still in an
2:27:312 hours, 27 minutes, 31 secondsera of exploration, in the area of the radio shows on TV and not,
2:27:402 hours, 27 minutes, 40 secondsand not a modern TV show that fully uses the format. - I think, I think you've made a lot of people,
2:27:492 hours, 27 minutes, 49 secondslike, see the possibility. And non- Uh, sorry. Non, non-technical people see the possibility of AI, and just fall in love with this idea, and
2:27:562 hours, 27 minutes, 56 secondsenjoy interacting with AI. And that's a bea- That's a really beautiful thing. I think I also speak for a lot of people in saying,
2:28:052 hours, 28 minutes, 5 secondsI think you're one of the, the great people in AI in terms of having a good heart, good vibes, humor, the right spirit. And so it would, in a sense, this model that you're describing,
2:28:202 hours, 28 minutes, 20 secondshaving open source part, and you being part of uh, also building a
2:28:282 hours, 28 minutes, 28 secondsthing inside, additionally, of a large company would be great, because it's great to have good people in those companies.
2:28:362 hours, 28 minutes, 36 seconds- Yeah. You know, what also people don't really see is... I made this in three months. I did other things as well. You know, I have a lot of projects. Like,
2:28:442 hours, 28 minutes, 44 secondsthis is not... Yeah, in January, this was my main focus because I saw the storm coming. But before that, I built a whole bunch of other things.
2:28:512 hours, 28 minutes, 51 secondsUm, I have so many ideas. Some should be there, some would be much better fitted when I have access to the latest toys- Uh, and I, I kind of want to have access to, like, the latest toys.
2:29:062 hours, 29 minutes, 6 secondsSo this is important, this is cool, this will continue to exist. My, my short-term focus is, like, working through those... Is it two- Is it
2:29:172 hours, 29 minutes, 17 seconds3,000 PRs now by now? I don't even know. Like, there's, there's a little bit of backlog. But this is not gonna
2:29:242 hours, 29 minutes, 24 secondsbe the thing that I'm gonna work until I'm, I'm, I'm 80, you know? This is... This is a window into the future. I'm gonna make this into a cool product. But yeah, I have like... I have more ideas.
2:29:362 hours, 29 minutes, 36 seconds- If you had to pick, is there a company you lean? So Meta, OpenAI, is there one you lean towards going?
2:29:442 hours, 29 minutes, 44 seconds- I spend time with both of those. And it's funny, because a few weeks ago, I didn't consider any of this. Um...
2:29:592 hours, 29 minutes, 59 secondsAnd it's really fucking hard. Like- - Yeah.
2:30:062 hours, 30 minutes, 6 seconds- I have some... I know no people at OpenAI. I love their tech. I think I'm the biggest codex advertisement shill that's unpaid. And it would feel so gratifying to,
2:30:182 hours, 30 minutes, 18 secondslike, put a price on all the work I did for free. And
2:30:252 hours, 30 minutes, 25 secondsI would love if something happens and those companies get just merged, because it's like...
2:30:322 hours, 30 minutes, 32 seconds- Is this the hardest decision you've ever had to do?
2:30:392 hours, 30 minutes, 39 seconds- No. You know, I had some breakups in the past that feel like it's the same level. - Relationships, you mean? - Yeah. - Yeah, yeah, yeah, yeah.
2:30:482 hours, 30 minutes, 48 seconds- Um, and, and I also know that, in the end, they're both amazing. I cannot go wrong. This is like- - Right.
2:30:542 hours, 30 minutes, 54 seconds- This is, like, one of the most prestigious and, and, and, and, and largest... I mean, not largest, but, like, they're both very cool companies.
2:31:022 hours, 31 minutes, 2 seconds- Yeah, they both really know scale. So, if you're thinking about impact, some of the wonderful technologies you've been
2:31:092 hours, 31 minutes, 9 secondsexploring, how to do it securely, and how to do it at scale, such that you can have a positive impact on a large number of people. They both understand that.
2:31:192 hours, 31 minutes, 19 seconds- You know, both Ned and Mark basically played all week with my product, and sent me like, "Oh, this is great." Or, "This is shit. Oh, I need to change this."
2:31:322 hours, 31 minutes, 32 secondsOr, like, funny little anecdotes. And people using your stuff is kind of like the biggest compliment, and also shows me that, you know, they actually... T- they actually care about it.
2:31:472 hours, 31 minutes, 47 secondsAnd I didn't get the same on the OpenAI side. Um, I got... I got to see some other stuff that I find really cool,
2:31:592 hours, 31 minutes, 59 secondsand they lure me with... I cannot tell you the exact number because of NDA, but
2:32:082 hours, 32 minutes, 8 secondsyou can, you can be creative and, and think of the Cerebras deal and how that would
2:32:152 hours, 32 minutes, 15 secondstranslate into speed. And it was very intriguing. You know, like, you give me Thor's hammer. Yeah.
2:32:282 hours, 32 minutes, 28 seconds... been lured with tokens. So, yeah.
2:32:342 hours, 32 minutes, 34 seconds- So, it- it's funny. So, so Marc started tinkering with the thing, essentially having fun with the thing.
2:32:412 hours, 32 minutes, 41 seconds- He got... He... Like, when he first... When he first approached me,
2:32:472 hours, 32 minutes, 47 secondsI got him in my, in my WhatsApp and he was asking, "Hey, when are we have a
2:32:542 hours, 32 minutes, 54 secondscall?" And I'm like, "I don't like calendar entries. Let's just call now." And he was like, "Yeah, give me 10 minutes, I need to finish coding." - Mm-hmm.
2:33:012 hours, 33 minutes, 1 second- Well, I guess that gives you street cred. It's like, ugh, like, he's still writing code. You know, he's-
2:33:072 hours, 33 minutes, 7 seconds- Yeah, he does - ... he didn't drift away in just being a manager, he gets me.
2:33:112 hours, 33 minutes, 11 secondsThat was a good first start. And then I think we had a, like, a 10-minute fight what's better, cloud code or Codex. Like, that's the thing you first do, like, you casually call-
2:33:242 hours, 33 minutes, 24 seconds- Yeah, that's awesome - ... someone with, like, the- that owns one of the largest companies in the world and, and you have a 10 minutes conversation about that. - Yeah, yeah.
2:33:302 hours, 33 minutes, 30 seconds- Uh, and then I think afterwards he called me eccentric but brilliant. But
2:33:382 hours, 33 minutes, 38 secondsI also had some... I had some really, really cool discussion with Sam Altman and
2:33:462 hours, 33 minutes, 46 secondshe's, he's very thoughtful brilliant and
2:34:002 hours, 34 minutesI like him a lot from the, from the little time I had, yeah. I mean, I know it's peop-
2:34:062 hours, 34 minutes, 6 secondssome people vilify both of those people. I don't think it's fair.
2:34:152 hours, 34 minutes, 15 seconds- I think no matter what the stuff you're building and the kind of human you are doing stuff at scale is kinda awesome. I'm excited.
2:34:242 hours, 34 minutes, 24 seconds- I am super pumped. And you know the beauty is if,
2:34:322 hours, 34 minutes, 32 secondsif it doesn't work out, I can just do my own thing again. Like, I, I told them, like, I, I don't do this for the money, I don't give a fuck. I-
2:34:422 hours, 34 minutes, 42 seconds- Yeah. - I mean, of course, of course it's a nice compliment but I wanna have
2:34:482 hours, 34 minutes, 48 secondsfun and have impact, and that's ultimately what made my decision.
Chapter 17: How OpenClaw works
2:34:582 hours, 34 minutes, 58 seconds- Can I ask you about... we've talked about it quite a bit, but maybe just zooming out about how OpenCloud works. We talked about different components, I want to ask if there's some interesting stuff we missed.
2:35:112 hours, 35 minutes, 11 secondsSo, there's the gateway, there's the chat clients,
2:35:162 hours, 35 minutes, 16 secondsthere's the harness there's the agentic loop. You said somewhere that everybody should im- implement an agent loop at some point in their lives.
2:35:242 hours, 35 minutes, 24 seconds- Yeah, because it's like the, it's like the Hello World in AI, you know? And it's actually quite simple. - Yeah.
2:35:302 hours, 35 minutes, 30 seconds- And it- it's good to understand that that stuff's not magic. You can, you can easily build it yourself. So,
2:35:402 hours, 35 minutes, 40 secondswriting your own little cloud code... I, I even did this at a conference in Paris for people to, like, introduce them to AI. I think it's it's a
2:35:482 hours, 35 minutes, 48 secondsfun little practice. Um, and you, you covered a lot. I think
2:35:552 hours, 35 minutes, 55 secondsone, one silly idea I had that turned out to be quite cool is I built this thing
2:36:052 hours, 36 minutes, 5 secondswith full system access. So it's like, you know, with great power comes great responsibility. And I was like, "How can I up the stakes a little bit more?"
2:36:132 hours, 36 minutes, 13 seconds- Yeah, right. - And I just made a... I made it proactive. So, I added a prompt. Initially, it was just a prompt, surprise me.
2:36:242 hours, 36 minutes, 24 secondsEvery, like, half an hour, surprise me, you know? And later on I changed it to be like a little more specific and-
2:36:312 hours, 36 minutes, 31 seconds... in the definition of surprise. Um,
2:36:342 hours, 36 minutes, 34 secondsbut the fact that I made it proactive and that it knows you and that it cares about you, it- it's at least it's
2:36:442 hours, 36 minutes, 44 secondsprogrammed to that, prompted to do that. And that, that is a follow on, on your current session makes it very interesting because it would just sometimes ask a follow-up question or like, "How's your day?"
2:36:532 hours, 36 minutes, 53 secondsAnd I just made a... I made it proactive. So, I added a prompt. Initially, it was just a prompt, surprise me. Every, like, half an hour, surprise me, you know? And later on I changed it to be like a little more specific and- And that, that is a follow on, on your current session makes it very interesting because it would just sometimes ask a follow-up question or like, "How's your day?" I mean,
2:37:022 hours, 37 minutes, 2 secondsagain, it's a little creepy or weird or interesting but Heartbeat very... in the beginning, it's still... today, it doesn't... the model doesn't choose to use it a lot.
2:37:162 hours, 37 minutes, 16 seconds- By the way, we're, we're, we're talking about Heartbeat, as you mentioned, the thing that regularly- - Yeah. Like kicks- - ... Acts.
2:37:232 hours, 37 minutes, 23 seconds- You just kick off the loop. - Isn't that just a cron job, man? - Yeah, right, I mean, it's like- - It's the cr- the criticisms that you get are hilarious.
2:37:312 hours, 37 minutes, 31 seconds- You can, you can deduce any idea to like a silly... Yeah, it's just, it's just a cron job in the end. I have like cron- separate cron jobs.
2:37:412 hours, 37 minutes, 41 seconds- Isn't love just evolutionary biology manifesting itself and isn't... aren't you guys just using each other?
2:37:492 hours, 37 minutes, 49 seconds- And then, yeah, and the project is all just glue of a few different dependencies- ... and there's nothing original. Why do people... Well, you know,
2:37:562 hours, 37 minutes, 56 secondsisn't Dropbox just FTP with extra steps? - Yeah.
2:38:012 hours, 38 minutes, 1 second- I found it surprising where I had this I had a shoulder operation a few months ago, so. - Mm-hmm.
2:38:082 hours, 38 minutes, 8 seconds- And the model rarely used Heartbeat, but then I was in the hospital, and it knew that I had the operation and it checked up on
2:38:152 hours, 38 minutes, 15 secondsme. It's like, "Are you okay?" And I just... It's like, again, apparently, like, if something's significant in the
2:38:232 hours, 38 minutes, 23 secondscontext, that triggered the Heartbeat when it rarely used the Heartbeat.... um,
2:38:302 hours, 38 minutes, 30 secondsand it does that sometimes for people, and that just makes it a lot more relatable.
2:38:362 hours, 38 minutes, 36 seconds- Uh, let me look this up on Perplexity, how OpenCall works just to see if I'm missing any of the stuff.
2:38:442 hours, 38 minutes, 44 secondsLocal agent run time, high-level architecture. There's... Oh, we haven't talked much about skills, I suppose. Skill hub, the tools in the skill lair,
2:38:522 hours, 38 minutes, 52 secondsbut that's definitely a huge component and there's a huge growing set of skills-
2:38:552 hours, 38 minutes, 55 seconds- You know, you know what I love? That half a year ago, like everyone was talking about MCPs-
2:39:022 hours, 39 minutes, 2 seconds- Yeah - ... and I was like, "Screw MCPs. Uh, every MCP would be better as a
2:39:102 hours, 39 minutes, 10 secondsCLI." And now this stuff doesn't even have MCP support. I mean, it, it has with asterisks, but not in the core lair, and nobody's complaining.
2:39:232 hours, 39 minutes, 23 seconds- Mm-hmm. - So my approach is if you want to extend the model with more features, you just build a CLI and the model can call the CLI,
2:39:372 hours, 39 minutes, 37 secondsprobably gets it wrong, calls the help menu, and then on demand loads into the context what it needs to use the CLI. It just needs a
2:39:472 hours, 39 minutes, 47 secondssentence to know that the CLI exists if it's something that the model doesn't know about default. And even for a while,
2:39:542 hours, 39 minutes, 54 secondsI, I didn't really care about skills, but skills are actually perfect for that because they, they boil down to a single sentence
2:40:042 hours, 40 minutes, 4 secondsthat explains the skill and then the model loads the skill, and that explains the CLI, and then the model uses the CLI. Some skills are, like raw, but most of the time, networks.
2:40:162 hours, 40 minutes, 16 seconds- It's interesting um, I'm asking Perplexity MCP versus skills,
2:40:202 hours, 40 minutes, 20 secondsbecause this kind of requires a hot take that's quite recent, because your general view is MCPs are dead-ish. So MCPs is a more structured
2:40:322 hours, 40 minutes, 32 secondsthing. So if you listen to Perplexity here, MCP is what can I reach? So APIs,
2:40:382 hours, 40 minutes, 38 secondsdatabase services files via protocol. So a structured protocol of how you communicate with a thing, and then skills is more
2:40:452 hours, 40 minutes, 45 secondshow should I work? Procedures, hostile helper scripts and prompts are often written in a kind of semi- structured natural language,
2:40:532 hours, 40 minutes, 53 secondsright? And so technically skills could replace MCP if you have a smart enough model.
2:41:002 hours, 41 minutes- I think the main beauty is, is that models are really good at calling Unix commands. So if you just add another
2:41:072 hours, 41 minutes, 7 secondsCLI, that's just another Unix command in the end. And MCP is... That has to be added in training. That's
2:41:152 hours, 41 minutes, 15 secondsnot a very natural thing for the model. It requires a very specific syntax. And the biggest thing, it's not
2:41:222 hours, 41 minutes, 22 secondscomposable. So imagine if I have a service that gives me better data and gives me the temperature, the average temperature, rain,
2:41:312 hours, 41 minutes, 31 secondswind and all the other stuff, and I get like this huge blob back. As a model, I always have to get the
2:41:382 hours, 41 minutes, 38 secondshuge blob back. I have to fill my context with that huge blob and then pick what I want. There's no way for the model to naturally filter
2:41:482 hours, 41 minutes, 48 secondsunless I think about it proactively and add a filtering way into my MCP. But if I would build the same as a CLI and
2:41:552 hours, 41 minutes, 55 secondsit would give me this huge blob, it could just add a JQ command and filter itself and then only, only get me what I actually need. Or maybe even
2:42:042 hours, 42 minutes, 4 secondscompose it into a script to, like do some calculations with the temperature and only give me the exact output and the mo- and the... you have no context pollution.
2:42:142 hours, 42 minutes, 14 secondsAgain, you can solve that with like sub- agents and more charades,
2:42:182 hours, 42 minutes, 18 secondsbut it's just like workarounds for something that might not be the optimal way. There's... It definitely it
2:42:272 hours, 42 minutes, 27 secondswas, you know, it was good that we had MCPs because it pushed a lot of companies towards building APIs and now I, I can like look at an MCP and just make it into a CLI.
2:42:372 hours, 42 minutes, 37 seconds- Mm-hmm. - Um, but this, this inherent problem that MCPs by default clutter up your
2:42:432 hours, 42 minutes, 43 secondscontext. Plus the fact that most MCPs are not made good, in
2:42:502 hours, 42 minutes, 50 secondsgeneral make it just not a very useful paradigm. There's some exceptions like
2:42:572 hours, 42 minutes, 57 secondsPlaywright for example that requires state and it's actually useful. That is an acceptable choice.
2:43:052 hours, 43 minutes, 5 seconds- So Playwright you use for browser use, which I think is c- already in OpenClaw is quite incredible, right? - Yeah.
2:43:122 hours, 43 minutes, 12 seconds- You can basically do everything, most things you can think of using browser use.
2:43:172 hours, 43 minutes, 17 seconds- That, that gets into the whole arch of every app is just a very slow API now, if they want or not. And that
2:43:272 hours, 43 minutes, 27 secondsthrough personal agents a lot of apps will disappear. You know, like I had a... I built
2:43:392 hours, 43 minutes, 39 secondsa CLI for Twitter. I mean, I- I just reverse engineered their website and used the internal API, which is not very allowed.
2:43:502 hours, 43 minutes, 50 seconds- It's called Bird, short-lived. - It was called Bird, because the bird had to disappear. - The, the wings were clipped.
2:43:592 hours, 43 minutes, 59 seconds- All they did is they just made access slower. Yeah, not tak- you're not actually taking a feature away,
2:44:052 hours, 44 minutes, 5 secondsbut now inst- if, if your agent wants to read a tweet, it actually has to open the browser and read the tweet. And it will still be able to read the tweet. It will just take longer.
2:44:132 hours, 44 minutes, 13 secondsIt's not like you are making something that was possible, not possible. No. Now, it's just taking... Now it's just a
2:44:212 hours, 44 minutes, 21 secondsbit slower. So, so it doesn't really matter if your service wants to be an API or not. If I can
2:44:302 hours, 44 minutes, 30 secondsaccess it in the browser...... easy API. It's a slow API.
2:44:352 hours, 44 minutes, 35 seconds- Can you empathize with their situation? Like, what would you do if you were Twitter, if you were X? Because they're basically trying to protect against other large companies scraping all their data.
2:44:452 hours, 44 minutes, 45 seconds- Yeah.
2:44:462 hours, 44 minutes, 46 seconds- But in so doing, they're cutting off like a million different use cases for smaller developers that actually want to use it for helpful cool stuff.
2:44:542 hours, 44 minutes, 54 seconds- I think that if you have a very low per day baseline per account that allows read-only access
2:45:052 hours, 45 minutes, 5 secondswould solve a lot of problems. There's plenty, plenty of automations where people create a bookmark and then use OpenClaw to, like,
2:45:132 hours, 45 minutes, 13 secondsfind the bookmark, do research on it, and then send you an email-
2:45:162 hours, 45 minutes, 16 seconds- Mm-hmm - ... with, like, more details on it or a summary. That's a cool approach. I also want all my bookmarks somewhere to search. I would still like to have that.
2:45:262 hours, 45 minutes, 26 seconds- So, read-only access for the bookmarks you make on X. That seems like an incredible application because a lot of us find a lot of cool stuff on X, we bookmark,
2:45:332 hours, 45 minutes, 33 secondsthat's the general purpose of X. It's like, holy shit, this is awesome. Oftentimes, you bookmark so many things you never look back at them. - Yeah.
2:45:402 hours, 45 minutes, 40 seconds- It would be nice to have tooling that organizes them and allows you to research it further. - Yeah, I mean, and to be frank, I, I mean,
2:45:472 hours, 45 minutes, 47 secondsI, I told Twitter proactively that, "Hey, I built this and there's a need." And they've been really nice, but also like,
2:45:572 hours, 45 minutes, 57 seconds"Take it down." Fair. Totally fair. But I hope that
2:46:032 hours, 46 minutes, 3 secondsthis woke up the team a little bit that there's a need. And if all you do is making it slower, you're just reducing
2:46:122 hours, 46 minutes, 12 secondsaccess to your platform. I'm sure there's a better way. I also, I'm very much
Chapter 18: AI slop
2:46:192 hours, 46 minutes, 19 secondsagainst any automation on Twitter. If you tweet at me with AI, I will block you. No first strike. As soon as it smells like AI, and AI still has a smell.
2:46:312 hours, 46 minutes, 31 seconds- Mm-hmm.
2:46:322 hours, 46 minutes, 32 seconds- Especially on tweets. It's very hard to tweet in a way that does look completely human. - Mm-hmm.
2:46:382 hours, 46 minutes, 38 seconds- And then I block. Like, I have a zero tolerance policy on that. And I think it would be very helpful if they,
2:46:482 hours, 46 minutes, 48 secondsif, like, tweets done via API would be marked.
2:46:532 hours, 46 minutes, 53 secondsMaybe there's some special cases where... But, and there should be, there should be a very easy way for agents to get their own Twitter account. Um...
2:47:042 hours, 47 minutes, 4 seconds- Mm-hmm.
2:47:072 hours, 47 minutes, 7 seconds- We, we need to rethink social platforms a little bit if, if, if we, we, we go towards a future where everyone has their agent and agents maybe have their own
2:47:162 hours, 47 minutes, 16 secondsInstagram profiles or Twitter accounts, so I can, like, do stuff on my behalf. I think it should very clearly be marked that they are doing stuff on my behalf and it's not
2:47:262 hours, 47 minutes, 26 secondsme. Because content is now so cheap. Eyeballs are the expensive part. And
2:47:362 hours, 47 minutes, 36 secondsI find it very triggering when I read something and then I'm like, oh, no, this smells like AI.
2:47:412 hours, 47 minutes, 41 seconds- Yeah. Like, where, where is this headed in terms of what we value about the human
2:47:472 hours, 47 minutes, 47 secondsexperience? It feels like we'll, we'll move more and more towards in-person interaction and we'll just communicate. We'll talk to our AI agent
2:47:582 hours, 47 minutes, 58 secondsto, to accomplish different tasks, to learn about different things, but we won't value online interaction because there'll be so much
2:48:082 hours, 48 minutes, 8 secondsAI slob that smells and so many bots that it's difficult.
2:48:152 hours, 48 minutes, 15 seconds- Well, if it's smart, then it shouldn't be difficult to filter. And then I can look at it if I want to. But yeah, this is, like, a big thing we need to solve right now. E-
2:48:282 hours, 48 minutes, 28 secondsespecially on this project, I get so many emails that are, let's say nicely, agentically written. - Yeah.
2:48:362 hours, 48 minutes, 36 seconds- But I much rather read your broken English than your AI
2:48:432 hours, 48 minutes, 43 secondsslob. You know, of course there's a human behind it, and yet they, they prompt it. I'd much rather read your prompt than what came out. Um,
2:48:522 hours, 48 minutes, 52 secondsI think we're reaching a point where I value typos again. Like, um... Like,
2:49:012 hours, 49 minutes, 1 secondand I, I mean, it also took me a while to, like, come to the realization. I, on my blog I experimented with creating a blog post with agents and
2:49:122 hours, 49 minutes, 12 secondsultimately it took me about the same time to, like, steer agent towards something I like. But it missed
2:49:212 hours, 49 minutes, 21 secondsthe nuances that, how I would write it. You know, you can like, you can steer it towards your style,
2:49:282 hours, 49 minutes, 28 secondsbut it's not gonna be all your style. So, I, I completely moved away from that. I, I, everything, everything I blog is organic, handwritten
2:49:372 hours, 49 minutes, 37 secondsand maybe, maybe I, I, I use AI as a fix my worse typos. But
2:49:472 hours, 49 minutes, 47 secondsthere's value in the rough parts of an actual human.
2:49:532 hours, 49 minutes, 53 seconds- Isn't that awesome? Isn't that beautiful? That now because of AI we value the raw humanity in each of us more.
2:50:022 hours, 50 minutes, 2 seconds- I also, I also realized this thing that I, I rave about AI and use it so much for anything that's code, but I'm allergic if it's stories.
2:50:122 hours, 50 minutes, 12 seconds- Right. Yeah. - Also, documentation, still fine with AI. You know, better than nothing.
2:50:172 hours, 50 minutes, 17 seconds- And for now it's still i- it applies in the mi- in the visual medium too. It's fascinating how allergic I am to even a little bit of AI slob in in video and images. It's useful, it's nice if it's like a little component of like-
2:50:322 hours, 50 minutes, 32 seconds- Or even, even those images. The, like, all these infographics and stuff, the-... they trigger me so hard. - Yeah.
2:50:392 hours, 50 minutes, 39 seconds- Like, it immediately makes me think less of your content. And it ... They were novel for, like, one week and now it just screams slop.
2:50:502 hours, 50 minutes, 50 seconds- Yeah.
2:50:512 hours, 50 minutes, 51 seconds- Even- even if people work hard on it, using ... And I- I have some on my blog post, you know, in the- in the time where I- I
2:51:002 hours, 51 minutesexplored this new medium. But now, they trigger me as well. It's like, yeah, this is ... This just screams AI slop. I-
2:51:062 hours, 51 minutes, 6 seconds- What... I don't know what that is, but I went through that too. I was really excited by the diagrams.
2:51:102 hours, 51 minutes, 10 secondsAnd then I realized, in order to remove from them hallucinations, you actually have to do a huge amount of work. And you're just using it to
2:51:182 hours, 51 minutes, 18 secondsdraw the better diagrams, great. And then I'm proud of the diagram. I've used them for literally, like, ki- ki- kind of like you said for maybe a couple of weeks. And now I look at
2:51:262 hours, 51 minutes, 26 secondsthose, and I- I feel like I feel when I look at Comic Sans as a font or- or something like this. It's like, "No, this is-"
2:51:352 hours, 51 minutes, 35 seconds- It's a smell. - "... this is fake. It's fraudulent. There's something wrong with it." And it... - It's a smell. - It's a smell.
2:51:442 hours, 51 minutes, 44 seconds- It's a smell. - And it's awesome because it re- it reminds you that we know.
2:51:482 hours, 51 minutes, 48 secondsThere's so much to humans that's amazing and we know that. And we- we know it. We know it when we see it. And so that gives me a lot of hope,
2:51:592 hours, 51 minutes, 59 secondsyou know? That gives me a lot of hope about the human experience. It's not going to be damaged by ... It's only going to be empowered as tools by AI. It's
2:52:072 hours, 52 minutes, 7 secondsnot going to be damaged or limited or somehow altered to where it's no longer
2:52:142 hours, 52 minutes, 14 secondshuman. So ... Uh, I need a bathroom break. Quick pause. You mentioned that a lot of the apps might be basically made obsolete.
Chapter 19: AI agents will replace 80% of apps
2:52:272 hours, 52 minutes, 27 secondsDo you think agents will just transform the entire app market?
2:52:302 hours, 52 minutes, 30 seconds- Yeah. Uh, I noticed that on Discord, that people just said
2:52:382 hours, 52 minutes, 38 secondshow their ... like, what they build and what they use it for. And it's like, why do you need MyFitnessPal when the agent already knows where I am?
2:52:482 hours, 52 minutes, 48 secondsSo, it can assume that I make bad decisions when I'm at, I don't know, Waffle House, what's around here? Or- or briskets in Austin.
2:52:572 hours, 52 minutes, 57 seconds- There's no bad decisions around briskets, but yeah. - No, that's the best decision, honestly. Um- - Your agent should know that.
2:53:042 hours, 53 minutes, 4 seconds- But it can, like ... It can modify my- my gym workout based on how well I slept, or if I'm ... if I have stress or
2:53:122 hours, 53 minutes, 12 secondsnot. Like, it has so much more context to make even better decisions than any of this app even could do. - Mm-hmm.
2:53:192 hours, 53 minutes, 19 seconds- It could show me UI just as I like. Why do I still need an app to do that? Why do I have to ... Why should I pay another subscription for
2:53:282 hours, 53 minutes, 28 secondssomething that the agent can just do now? And why do I need my- my Eight Sleep app to control
2:53:382 hours, 53 minutes, 38 secondsmy bed when I can tell the a- ... tell the agent to ... You know, the agent already knows where I am, so he can, like, turn off what I don't use.
2:53:452 hours, 53 minutes, 45 seconds- Mm-hmm.
2:53:472 hours, 53 minutes, 47 seconds- And I think that will ... that will translate into a whole category of apps that are no longer ... I will just naturally stop using because my agent can just do it better.
2:54:002 hours, 54 minutes- I think you said somewhere that it might kill off 80% of apps. - Yeah.
2:54:052 hours, 54 minutes, 5 seconds- Don't you think that's a gigantic transformative effect on just all software development? So that means it might kill off a lot of software companies.
2:54:132 hours, 54 minutes, 13 seconds- Yeah. Um-
2:54:162 hours, 54 minutes, 16 seconds- It's a scary thing. So, like, do you think about the impact that has on the economy? On, Just the ripple effects it has to society?
2:54:272 hours, 54 minutes, 27 secondsTransforming who builds what tooling. It empowers a lot of
2:54:342 hours, 54 minutes, 34 secondsusers to get stuff done, to get stuff more efficiently, to get it done cheaper.
2:54:412 hours, 54 minutes, 41 seconds- It's also new services that we will need, right? For example, I want my agent to have an allowance. Like,
2:54:502 hours, 54 minutes, 50 secondsyou solve problems for me, here's like 100 bucks in order to solve problems for me. And if I tell you to order me
2:54:582 hours, 54 minutes, 58 secondsfood, maybe it uses a service. Maybe it uses something like rent-a-human to, like, just get that done for me.
2:55:062 hours, 55 minutes, 6 seconds- Mm-hmm. - I don't actually care. I care about solve my problem. There's space for-
2:55:132 hours, 55 minutes, 13 secondsfor new companies to solve that well. Maybe don't ... Not all apps disappear. Maybe some transform into being API.
2:55:212 hours, 55 minutes, 21 seconds- So, basically, apps that rapidly transform in being agent-facing.
2:55:302 hours, 55 minutes, 30 secondsSo, there's a real opportunity for, like, Uber Eats, that we just used earlier today. It- it's companies this, of which there's many.
2:55:422 hours, 55 minutes, 42 secondsWho gets there fastest to being able to interact with OpenClaw in a way that's the m- the most natural, the easiest?
2:55:502 hours, 55 minutes, 50 seconds- Yeah. And also, apps will become API if they want or not. Because my agent can figure out how to use my phone. I mean, on- on the other side,
2:56:012 hours, 56 minutes, 1 secondit's a little more tricky. On Android, that's already ... People already do that. And then we'll just click the Order Uber for Me button for me. Um,
2:56:132 hours, 56 minutes, 13 secondsor maybe another service. Or maybe there's- there's a ... there's an API I can call so it's faster. Uh, I think that's a space we're just
2:56:212 hours, 56 minutes, 21 secondsbeginning to even understand what that means. And I ... Again, I didn't even ... That was not something I thought of. Something that I-
2:56:312 hours, 56 minutes, 31 secondsthat I discovered as people use this, and it ... We are still so early. But yeah, I think data is very important.
2:56:382 hours, 56 minutes, 38 secondsLike, apps that can give me data, but that also can be API. Why do I need a Sonos app anymore when I can ... when my agent can
2:56:452 hours, 56 minutes, 45 secondstalk to the Sonos?... Speakers directly. Like my cameras, there's like a crappy app,
2:56:522 hours, 56 minutes, 52 secondsbut they have, they have an API, so my agent uses the API now.
2:56:572 hours, 56 minutes, 57 seconds- So it's gonna force a lot of companies to have to shift focus. That's kind of what the internet did, right? You have to rapidly rethink, reconfigure what you're selling, how you're making money.
2:57:102 hours, 57 minutes, 10 seconds- Yeah, and some companies were really not like that. For example, there's no CLI for Google, so I had to like, do... have to do anything myself and
2:57:212 hours, 57 minutes, 21 secondsbuild GAWK. That's like a CLI for Google. And at the... Yeah, at the end
2:57:282 hours, 57 minutes, 28 secondsuser, they have to give me the emails because otherwise I cannot use their product. If I'm a company and I try
2:57:362 hours, 57 minutes, 36 secondsto get Google data, Gmail, there's a whole complicated process, to the point where sometimes
2:57:442 hours, 57 minutes, 44 secondsstartups acquire startups that went through the process, so they don't- don't have to work with Google for half a year to be certified
2:57:512 hours, 57 minutes, 51 secondsto being able to access Gmail. But my agent can access Gmail because I can just connect to it.
2:57:582 hours, 57 minutes, 58 secondsIt's still crappy because I need to, like, go through Google's developer jungle to get a key, and that's still annoying.
2:58:092 hours, 58 minutes, 9 secondsBut they cannot prevent me. And worst case, my agent just clicks on the, on the website and gets the data out that way.
2:58:172 hours, 58 minutes, 17 seconds- Through browsers? - Yeah. I mean, I, I watch my agent happily click the I'm not a robot button.
2:58:252 hours, 58 minutes, 25 secondsAnd there's this, this whole... That's gonna be... That's gonna be more heated. You see companies like Cloudflare that
2:58:352 hours, 58 minutes, 35 secondstry to prevent bot access. And in some ways, that's useful for scraping. But in other ways, if I'm, I'm a
2:58:432 hours, 58 minutes, 43 secondspersonal user, I want that. You know, sometimes I, I use Codex and I, I read an article about modern React patterns,
2:58:552 hours, 58 minutes, 55 secondsand it's like a Medium article. I paste it in and the agent can't read it because they block it. So then I have to copy-paste the actual text. Or in
2:59:052 hours, 59 minutes, 5 secondsthe future, I'll learn that maybe I don't click on Medium because it's annoying, and I use other websites that actually are agent friendly. So, uh-
2:59:132 hours, 59 minutes, 13 seconds- There's gonna be a lot of powerful, rich companies fighting back. So it's really intere- You're at the center, you're the catalyst, the leader,
2:59:232 hours, 59 minutes, 23 secondsand happen to be at the center of this kind of revolution where it's get- gonna completely change how we interact with services with, with
2:59:312 hours, 59 minutes, 31 secondsweb. And so, like, there's companies at Google that are gonna push back. I mean, there's every major companies you could think of is gonna push back.
2:59:392 hours, 59 minutes, 39 seconds- Even... Yeah, even search. Um, I now use, I think Perplexity or Brave
2:59:472 hours, 59 minutes, 47 secondsas providers because Google really doesn't make it easy to use Google without Google. I'm not sure if that's the right strategy, but I'm not Google.
2:59:582 hours, 59 minutes, 58 seconds- Yeah, there's a, there's a nice balance from a big company perspective 'cause if you push back too much for too long, you become Blockbuster and you lose everything to the
3:00:063 hours, 6 secondsNetflixes of the world. But some pushback is probably good during a revolution to see. - Yeah. But you see that, that... Like, this is something that the people want.
3:00:143 hours, 14 seconds- Right. - So- - Yes. - If I'm on the go, I don't wanna open a calendar app. I just... I wanna tell my agent,
3:00:223 hours, 22 seconds"Hey, remind me about this dinner tomorrow night," and maybe invite two of my friends and then maybe send a what- send a WhatsApp message to my
3:00:293 hours, 29 secondsfriend. And I don't need... I don't want or need to open apps for that. I think that we passed that age, and now everything is, like,
3:00:403 hours, 40 secondsmuch more connected and, and fluid if those companies want it or not. And I think, well, the right companies will find
3:00:493 hours, 49 secondsways to jump on the train, and other companies will perish.
3:00:553 hours, 55 seconds- You got to listen to what the people want. We talked about programming quite a bit, and a lot of folks that are developers are really worried about their jobs, about
Chapter 20: Will AI replace programmers?
3:01:053 hours, 1 minute, 5 secondstheir... About the future of programming. Do you think AI replaces programmers completely? Human programmers?
3:01:113 hours, 1 minute, 11 seconds- I mean, we're definitely going in that direction. Programming is just a part of building products. So maybe, maybe AI does replace programmers eventually. But there's so much more to that art. Like,
3:01:303 hours, 1 minute, 30 secondswhat do you actually wanna build? How should it feel? How's the architecture? I don't think agents will replace all of that.
3:01:403 hours, 1 minute, 40 secondsYeah, like, just the, the actual art of programming,
3:01:443 hours, 1 minute, 44 secondsit will, it will stay there, but it's, it's gonna be like knitting. You know? Like, people do that because they like it, not because it makes
3:01:533 hours, 1 minute, 53 secondsany sense. So the... I read this article this morning about someone that it's okay to mourn our craft. And I
3:02:033 hours, 2 minutes, 3 secondscan... A part of me very strongly resonates with that because in my past I, I spent a lot of time tinkering, just being really deep in the flow and just, like,
3:02:153 hours, 2 minutes, 15 secondscranking out code and, like, finding really beautiful solutions. And yes, in a way it's, it's sad because that will go away.
3:02:283 hours, 2 minutes, 28 secondsAnd I also get a lot of joy out of just writing code and being really deep in my thoughts and forgetting
3:02:383 hours, 2 minutes, 38 secondstime and space and just being in this beautiful state of flow. But you can get the same state of
3:02:463 hours, 2 minutes, 46 secondsflow... I get a similar state of flow by working with agents and building and thinking really hard about problems. It is different-...
3:02:553 hours, 2 minutes, 55 secondsbut... And it's okay to mourn it, but,
3:02:593 hours, 2 minutes, 59 secondsuh, I mean, that's not something we can fight. Like, there is... the world for a long time had a... there was a
3:03:073 hours, 3 minutes, 7 secondslack of intelligence, if you s- if you see it like that, of people building things, and that's
3:03:133 hours, 3 minutes, 13 secondswhy salaries of software developers reached stupidly high amounts
3:03:233 hours, 3 minutes, 23 secondsand then will go away. There will still be a lot of demand for people that understand how to build things. It's just that all this
3:03:343 hours, 3 minutes, 34 secondstokenized intelligence enables people to do a lot more, a lot
3:03:423 hours, 3 minutes, 42 secondsfaster. And it will be even more... even faster and even more because those things are continuously improving.
3:03:493 hours, 3 minutes, 49 secondsWe had similar things when... I mean, it's probably not a perfect analogy, but when we created the steam engine, and they
3:03:563 hours, 3 minutes, 56 secondsbuilt all these factories and replaced a lot of manual labor, and then people revolted and broke the machines. Um,
3:04:063 hours, 4 minutes, 6 secondsI- I can relate that if you very deeply identify that you are a programmer,
3:04:163 hours, 4 minutes, 16 secondsthat it's scary and that it's threatening because what you like and what you're really good at is now being done by
3:04:273 hours, 4 minutes, 27 secondsa soulless or not entity. But I don't think you're just a programmer. That's a very limiting view of your craft. You are, you are still a builder.
3:04:403 hours, 4 minutes, 40 seconds- Yeah, there's a couple of things I want to say. So one is, I never... As you're articulating this beautifully, I no- I'm realizing I never thought I would...
3:04:493 hours, 4 minutes, 49 secondsthe thing I love doing would be the thing that gets replaced. You hear these stories about these, like you
3:04:553 hours, 4 minutes, 55 secondssaid, with the steam engine. I've, I've spent so many, I don't know, maybe thousands of hours poring over code and putting my heart and soul and,
3:05:063 hours, 5 minutes, 6 secondslike, and just, like, some of my most painful and happiest moments were alone behind... I, I was an Emacs person for a long time. Man, Emacs.
3:05:173 hours, 5 minutes, 17 secondsAnd, and then there's an identity and there's meaning, and there's... Like, when I walk about the world, I don't say it out loud, but
3:05:253 hours, 5 minutes, 25 secondsI think of myself as a programmer. And to have that in a matter of months... I mean, like you mentioned, April to November, it really is a leap that happened, a shift that's happening.
3:05:393 hours, 5 minutes, 39 secondsTo have that completely replaced is is painful. It's, it's truly painful. But I also think programmers, builders more broadly,
3:05:503 hours, 5 minutes, 50 secondsbut what is, what is the act of programming? I, I think programmers are generally best equipped at this moment in history
3:06:003 hours, 6 minutesto learn the language, to empathize with agents, to learn the language of agents. To feel the CLI.
3:06:103 hours, 6 minutes, 10 seconds- Yeah. - Like, like to understand what is the thing you need, you the agent, need to do this task the best?
3:06:213 hours, 6 minutes, 21 seconds- I think at some point it's just gonna be called coding again, and it's just gonna be the new normal. - Yeah.
3:06:253 hours, 6 minutes, 25 seconds- And yet, while I don't write the code, I very much feel like I'm in the driver's seat and I am, I am writing the code, you know? It's just-
3:06:373 hours, 6 minutes, 37 seconds- You'll still be a programmer. It's just the activity of a programmer is, is different.
3:06:413 hours, 6 minutes, 41 seconds- Yeah, and because on X, the bubble, I mean, is mostly positive. On, on Mastodon and
3:06:473 hours, 6 minutes, 47 secondsBluesky, I don't... I also use it less because oftentimes I got attacked for my blog posts. And
3:06:563 hours, 6 minutes, 56 secondsI, I had stronger reactions in the past, now I can sympathize with those people more 'cause, in a way I get it. It... In a way, I also don't get it because
3:07:063 hours, 7 minutes, 6 secondsit's very unfair to grab onto the person that you see right now and unload all your fear and hate.
3:07:153 hours, 7 minutes, 15 secondsIt's gonna be a change and it's gonna be challenging, but it's also... I don't know. I find it incredibly fun and, and, and gratifying. And
3:07:253 hours, 7 minutes, 25 secondsI can, I can use the new time to focus on much more details. I think the level of expectation of what we
3:07:333 hours, 7 minutes, 33 secondsbuild is also rising because it's just now... The default is now
3:07:393 hours, 7 minutes, 39 secondsso much easier, so software is changing in many ways. There's gonna be a lot
3:07:463 hours, 7 minutes, 46 secondsmore. And then you have all these people that are screaming, "Oh yeah, but what about the water?" You
3:07:533 hours, 7 minutes, 53 secondsknow? Like, I did a conference in Italy about the, the state of AI, and
3:08:003 hours, 8 minutesm- my whole motivation was to push people away from, don't see yourself as an iOS developer anymore. You're now a builder, and
3:08:093 hours, 8 minutes, 9 secondsyou can use your skills in many more ways. Also because apps are slowly going away. People didn't like that. Like
3:08:163 hours, 8 minutes, 16 secondsa lot of people didn't like what I had to say. And I don't think I was hyperbole, I was just like, "This is how I see the future." Maybe this is not how it's going to be, but I'm pretty sure a version of that will happen.
3:08:303 hours, 8 minutes, 30 secondsAnd the first question I got was, "Yeah, but what about the insane water use on data centers?" But then you actually sit down and do the
3:08:383 hours, 8 minutes, 38 secondsmaths, and then for most people if you just skip one burger per month, that
3:08:443 hours, 8 minutes, 44 secondscompensates the, the CO2 output, or, like, the water use in equivalent of tokens. I mean,
3:08:543 hours, 8 minutes, 54 secondsthe maths is, is... the maths is tricky, and it depends if you add pre-training, then maybe it's more than just one patty.... but it's
3:09:013 hours, 9 minutes, 1 secondnot off by a factor of 100, you know? So, so the... or like golf is still using way
3:09:093 hours, 9 minutes, 9 secondsmore water than all data centers together. So are you also hating people that play golf? Those people grab on anything that they
3:09:173 hours, 9 minutes, 17 secondsthink is bad about AI without seeing the potential things that might be good about AI. - Mm-hmm.
3:09:243 hours, 9 minutes, 24 seconds- And I'm not saying everything's good. It's certainly gonna be a very transformative technology for our society.
3:09:323 hours, 9 minutes, 32 seconds- There's to steel man the, the criticism in general, I do wanna say in my experience with Silicon
3:09:393 hours, 9 minutes, 39 secondsValley there's a bit of a bubble in the sense that
3:09:463 hours, 9 minutes, 46 secondsthere's a kind of excitement and an over- focus about the positive that the technology can bring.
3:09:543 hours, 9 minutes, 54 seconds- Yeah. - And... which is great. It's great to focus on... N- not to,
3:09:593 hours, 9 minutes, 59 secondsnot to be paralyzed by fear and fear- mongering and so on, but there's also within that excitement, and within everybody talking just to
3:10:073 hours, 10 minutes, 7 secondseach other, there's a dismissal of the basic human experience across the United States and the Midwest, across the world.
3:10:163 hours, 10 minutes, 16 secondsIncluding the programmers we mentioned, including all the people that are gonna lose their jobs,
3:10:193 hours, 10 minutes, 19 secondsincluding the s- the measurable pain and suffering that happens at the short-term scale when there's change of any kind. Especially
3:10:283 hours, 10 minutes, 28 secondslarge-scale transformative change that we're about to face if what we're talking about will materialize. And so to
3:10:353 hours, 10 minutes, 35 secondsha- having a bit of that humility and awareness about the tools you're building, they're going to cause pain.
3:10:433 hours, 10 minutes, 43 secondsThey will long term hopefully bring about a better world, and even more opportunities-
3:10:483 hours, 10 minutes, 48 seconds- Yeah - ... and even more awesomeness. But having that kind of like quiet moment
3:10:563 hours, 10 minutes, 56 secondsoften of, of respect for the pain that is going to be felt. And so not, not enough of that is, I think, done,
3:11:043 hours, 11 minutes, 4 secondsso it's, it's good to have a bit of that.
3:11:073 hours, 11 minutes, 7 seconds- And then I also have to put against some of the emails I got where people told me they have a small business, and they've been
3:11:153 hours, 11 minutes, 15 secondsstruggling. And, and OpenClaw helped them automate a few of the tedious tasks from, from collecting invoices to like answering customer emails
3:11:263 hours, 11 minutes, 26 secondsthat then freed them up and like cost them a bit more joy in their life. - Mm-hmm.
3:11:313 hours, 11 minutes, 31 seconds- Or, or some emails where they told me that OpenClaw helped their disabled daughter. That she's now
3:11:383 hours, 11 minutes, 38 secondsempowered and feels she can do much more than before. Which is amazing, right? Because you could, you could do that before as well. The technology was there. I didn't,
3:11:483 hours, 11 minutes, 48 secondsI didn't invent a whole new thing, but I made it a lot easier and more accessible, and that did show people the possibilities that they previously wouldn't see.
3:12:003 hours, 12 minutesAnd now they apply it for good. - Mm-hmm.
3:12:033 hours, 12 minutes, 3 seconds- Or like also the fact that, yes, I, I, I suggest the, the, the latest and
3:12:093 hours, 12 minutes, 9 secondsbest models, but you can totally run this on free models. You can run this locally. You can run this on, on, on Keyme or other,
3:12:173 hours, 12 minutes, 17 secondsother, other models that are way more accessible price-wise,
3:12:233 hours, 12 minutes, 23 secondsand still have a, a very powerful system that might otherwise not be possible. Because other things like, I don't know, Entropik's CoWork
3:12:323 hours, 12 minutes, 32 secondsis locked in into their space, so it's not all black and white. There's... I got a lot of emails that were heartwarming and amazing.
3:12:433 hours, 12 minutes, 43 secondsAnd, and I don't know, it just made me really happy. - Yeah, there's a lot... It has brought joy into a lot of people's lives. Not just,
3:12:523 hours, 12 minutes, 52 secondsnot just programmers. Like a lot of people's lives. It's, it's,
3:12:563 hours, 12 minutes, 56 secondsit's beautiful to see. What gives you hope about this whole thing we have going on with human civilization?
Chapter 21: Future of OpenClaw community
3:13:033 hours, 13 minutes, 3 seconds- I mean, I inspired so many people. There's like... there's this whole
3:13:093 hours, 13 minutes, 9 secondsbuilder vibe again. People are now using AI in a more playful way
3:13:173 hours, 13 minutes, 17 secondsand are discovering what it can do and how it can like help them in their life.
3:13:243 hours, 13 minutes, 24 secondsAnd creating new places that are just sprawling of creativity. I don't know. Like,
3:13:353 hours, 13 minutes, 35 secondsthere's like ClawCoin in Vienna. There's like 500 people. And there's such a high percentage of people that uh, want to present, which is to me really surprising, because u-
3:13:453 hours, 13 minutes, 45 secondsusually it's quite hard to find people that want to like talk about what they built. And now it's, there's an abundance. So that gives me hope that we can,
3:13:583 hours, 13 minutes, 58 secondswe can figure shit out. - And it makes it accessible to basically everybody. - Yeah.
3:14:053 hours, 14 minutes, 5 seconds- Just imagine all these people building, especially as you make it simpler and simpler, more
3:14:123 hours, 14 minutes, 12 secondssecure. It's like anybody who has ideas and can express those ideas in language can build. That's crazy.
3:14:223 hours, 14 minutes, 22 seconds- Yeah, that's ultimately power to the people, and one of the beauty,
3:14:283 hours, 14 minutes, 28 secondsthe beautiful things that come out of AI. Not just, not just a slop generator.
3:14:363 hours, 14 minutes, 36 seconds- Well, Mr. Clawfather, I just realized when I said that in the beginning,
3:14:403 hours, 14 minutes, 40 secondsI violated two trademarks, because there's also the Godfather. I'm getting sued by everybody. Um,
3:14:473 hours, 14 minutes, 47 secondsyou're a wonderful human being. You've created something really special, a special community, a special product, a special set of ideas. Plus, the entire... the humor, the good vibes,
3:14:593 hours, 14 minutes, 59 secondsthe inspiration of all these people building, the excitement to build. So I'm truly grateful for everything you've been
3:15:083 hours, 15 minutes, 8 secondsdoing and for who you are, and for sitting down to talk with me today. Thank you, brother. - Thanks for giving me the chance to tell my story.
3:15:173 hours, 15 minutes, 17 seconds- Thanks for listening to this conversation with Peter Steinberger. To support this podcast,
3:15:213 hours, 15 minutes, 21 secondsplease check out our sponsors in the description, where you can also find links to contact me, ask questions, give feedback and so on. And
3:15:293 hours, 15 minutes, 29 secondsnow let me leave you with some words from Voltaire. "With great power comes great responsibility." Thank you for listening, and hope to see you next time.