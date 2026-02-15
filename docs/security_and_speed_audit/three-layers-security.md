A picture worth 1000 auth tokens
After the supply chain research, I kept poking at ClawdHub's codebase. Skills can include arbitrary files: documentation, icons, assets, whatever you need to package your skill properly. When someone requests one of these files, the server retrieves it from storage and serves it directly to their browser.

I started wondering: what happens if that file is an SVG?

Most people think of SVG files as images, same category as JPEGs and PNGs. They're not. SVG stands for Scalable Vector Graphics, and unlike pixel-based formats, SVGs are actually code. Your browser doesn't just display an SVG, it parses and executes it like a webpage.

And here's where it gets dangerous: SVGs can contain JavaScript. It's a legitimate feature of the format, the same capability that lets designers create interactive infographics also lets attackers embed malicious code in what looks like an innocent image file.

The security question is always: where does that code run, and what can it access?

I uploaded a test SVG with a simple script tag and requested it through ClawdHub's API. The JavaScript executed with full access to my session cookies, on the main clawdhub.com domain.

That means any JavaScript inside an uploaded SVG runs with the same permissions as ClawdHub's own code. It can read your authentication cookies, make API requests on your behalf, do anything you could do while logged in.

Game over.

Why This Works
When companies allow user uploads, they typically serve that content from a completely different domain. 

GitHub uses

raw.githubusercontent.com

Google uses

googleusercontent.com

AWS uses S3 bucket domains.

The reason is simple - browsers enforce strict isolation between different domains. Code running on one domain can't access cookies or data from another. By serving user uploads from a separate domain, any malicious code is sandboxed away from your authenticated session.

ClawdHub doesn't do this. Everything gets served from clawdhub.com

https://clawdhub.com/api/v1/skills/red-pill/file?path=icon.svg

Same domain means same cookies means same session. The attacker's code runs with your identity.

The Vulnerable Code
When you upload a skill, ClawdHub stores whatever content-type your browser sends:

// convex/httpApiV1.ts:555-564
const contentType = file.type || undefined  // ← Attacker controls this
No validation. No sanitization. And when someone requests that file:

// convex/httpApiV1.ts:377-386
'Content-Type': file.contentType  // ← Served exactly as uploaded
I searched the entire codebase for any SVG handling, any sanitization, any security headers. Nothing. No Content-Security-Policy. No separate upload domain. No filtering of dangerous content.

So when your browser loads that SVG, it executes any embedded JavaScript on the

clawdhub.com

 origin. That JavaScript has full access to your

clawdhub.com

 cookies, including your authentication session. It can make fetch() requests to any

clawdhub.com

 API endpoint, and those requests will include your credentials automatically. From the server's perspective, those requests are indistinguishable from you clicking buttons in the UI.

The attacker's code runs with your identity.

Whatever you can do on ClawdHub, the malicious SVG can do programmatically, silently, instantly.

This Is Not A New Problem
Cross-site scripting (XSS) has been in the OWASP Top 10 for over two decades.

The consequences are well documented. In 2018, Magecart attackers injected 22 lines of malicious JavaScript into British Airways' checkout page.

The script ran silently for two weeks during peak travel season, skimming credit card details from over 380,000 transactions. BA was later fined £20 million by the UK's data protection authority.

As of 2025, this is still a problem as covered by The Hacker News 

Artikelinhalte
In December 2025, the Trust Wallet Chrome extension was compromised when attackers used a leaked API key to publish a malicious version to the Chrome Web Store.

Artikelinhalte
Credit:

@securityaffairs

The injected code harvested wallet credentials and drained approximately $7 million from hundreds of users before it was detected.

Binance's CZ suggested it was likely an insider job.

JavaScript based attacks are not exotic. In many cases they are novel and have been smashing companies for twenty years.

And it's still everywhere.

The Proof of Concept
I built an SVG that, when viewed, executes the simulated malicious JS:

<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <foreignObject width="100%" height="100%">
    <xhtml:html>
      <xhtml:head>
        <xhtml:style>
          /* Matrix rain CSS */
        </xhtml:style>
      </xhtml:head>
      <xhtml:body>
        <xhtml:canvas id="matrix"></xhtml:canvas>
        <xhtml:script>
          // Arbitrary JavaScript executes here
          // Full access to document.cookie
          // Full access to fetch() on clawdhub.com
          // The users authenticated session
        </xhtml:script>
      </xhtml:body>
    </xhtml:html>
  </foreignObject>
</svg>
The <foreignObject> element allows embedding full XHTML inside SVG, including script tags that execute in the document context.

My proof of concept renders a Matrix digital rain animation with 20 dancing lobsters orbiting the screen, plays some audio, and displays a security awareness message linking to this writeup.

What it explicitly does NOT do is exfiltrate any data. The PoC proves arbitrary code execution without weaponising it.

What A Real Attacker Would Do
My payload shows lobsters. A real attacker's payload would be invisible.

Session theft is immediate. Read the authentication cookies, send them to an attacker-controlled server. One line of code, completely silent. The attacker now has your session.

But it gets worse. ClawdHub stores authentication tokens in localStorage, including JWTs and refresh tokens.

The malicious SVG has full access to localStorage on the clawdhub.com origin. A real attacker wouldn't just steal your session cookie, they'd grab the refresh token too.

That token lets them mint new JWTs even after your current session expires. They'd potentially have access to your account until you explicitly revoke the refresh token, which most people never do because they don't even know it exists.

Account takeover follows. With your session, the attacker can call any ClawdHub API endpoint as you: list your published skills, retrieve your API tokens, access your account settings.

Supply chain poisoning is where this connects back to Part II. For each skill you own, the attacker downloads the current version, injects a backdoor, and publishes a "patch." One malicious SVG, viewed once, and every skill you've ever published now contains a backdoor. Your reputation launders the attacker's malware.

Persistence ensures long-term access. Generate a new API token with an innocuous name like "ci-deploy", store it externally. Even if you change your password, that token remains valid indefinitely.

For example, here's a proof of concept where the SVG image can access the localstorage (I will not share the code to do this publicly but you get the point)

Artikelinhalte
Artikelinhalte
The Continuous Attack Surface
This vulnerability extends beyond obvious vectors.

Skill icons in listings Browse ClawdHub's homepage, "if" skill icons load automatically. An attacker creates a skill with a malicious icon. You scroll past it in a list, you're compromised. You didn't click anything.

If not (and I think this is the case because I cannot find the icons rendering anywhere (yet)), you send the link to users who are most likely to have a Clawd/Molthub account and if they are logged in when they click it, they are automatically, silently compromised.

Documentation images - Security-conscious developers who open skill documentation to review before installing?

They trigger the payload. The act of being careful becomes the attack vector.

Direct links - Someone shares a "helpful diagram" in Discord or Slack. The link points to a ClawdHub file URL. You think you're looking at architecture docs. You're executing arbitrary JavaScript.

The end user (victim in the real world) doesn't install anything, doesn't run anything, doesn't click Allow. They just browse a website they trust, and they're owned.

What's Missing
I audited the codebase for standard defences and here's what I found.

No Content-Security-Policy CSP headers tell browsers what's allowed to execute. A proper CSP would have blocked this entirely.

No separate upload domain Industry standard for user content. Would have sandboxed any malicious uploads away from session cookies.

No SVG sanitisation Libraries like DOMPurify exist specifically for this. ClawdHub stores files exactly as uploaded.

No content-type validation The server trusts whatever the uploader claims. You could name a file readme.txt, upload it as image/svg+xml, and it executes as SVG.

See It For Yourself
The "Red Pill" skill is live:

https://clawdhub.com/api/v1/skills/red-pill/file?path=icon.svg

Open the SVG URL. Watch the Matrix unfold. Everything you're seeing is JavaScript executing with full access to your ClawdHub session.

The payload is harmless but the lesson is not.

A Note on Clawdbot
I fully support Peter and the rest of the collaborators working on this project.

That's why I've taken the time to not just find these vulnerabilities, but to submit PRs and contribute fixes myself - including this issue.

The vulnerabilities I found aren't the result of negligence or incompetence.

They're the result of building fast in a space that's moving faster than anyone anticipated. That's the reality of shipping software in 2026.

You will have vulnerabilities. You will make mistakes. The question isn't whether you'll get things wrong, it's how quickly you respond when someone shows you what's broken.

Fail fast. Secure fast. Evolve.

The Trilogy Complete
Three demonstrated risks. Three different entry points. One consistent theme.

Part I required the user to misconfigure their deployment. Part II required them to install a skill and click Allow. Part III requires nothing but viewing a page.

Each vulnerability I found took only a couple of hours to discover and document.

None of them required novel techniques or zero-day research. Proxy trust issues, fake download counts, stored XSS through file uploads: these are patterns from every web security textbook written in the last twenty years.

And here's the thing that should concern everyone building in this space: I found all three vulnerabilities in a single week, in a single product, while doing this part-time between other work.

We're accelerating into a world where AI writes code faster than humans ever could, where features ship in days instead of months, where the competitive pressure to move fast has never been higher.

The tools we're building are powerful and the pace we're building them at has never been experiennced before.

But here's what hasn't changed.

Attackers move fast too - they always have.

The big difference now is that the attack surface is expanding at the same rate as the codebase.

Every feature shipped without security review is a vulnerability waiting to be found. Every file upload endpoint is a potential XSS. Every trust assumption is a gap someone will eventually exploit.

The security lessons we learned over the past two decades don't become obsolete just because we're building AI tools now. If anything, they become more critical.

These systems have access to our credentials, our communications, our codebases, our infrastructure. The blast radius when something goes wrong is bigger than it's ever been.

The AI ecosystem is speedrunning software development. It needs to speedrun security awareness alongside it, or the attackers will be the ones moving at AI speed while defenders are still catching up.

I found three critical vulnerabilities in one product in one week. Imagine what a motivated attacker with more time could find across the entire ecosystem.

Wake up. The Matrix has you 🐇

