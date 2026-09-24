The next big thing in agentic coding will be the "software factory" which is a largely autonomous setup where agents create software from specs but also from live feedback through things like issues or telemetry and build and improve the software without human input.
Human escalation is treated like its own tool call that is invoked as sparingly as possible.
We don't want to do this on dedicated hardware tied to one provider. Everything should be cloud-native: so immutable and runnable on cheap hardware with no vendor-specific services where possible.
Since this is the next big thing I need to learn how this can be done for enterprise, even though I am just a lone dev. But I need a project like this to show enterprises that I can do this.

So:

- everything immutable, bootstrappable setup so I can delete everything and then easily re-seed it.
- Build on cheap hardware like a couple of Hetzner boxes plus some S3 storage. The point is not Hetzner per se, but it is an example I am familiar with and it should be built in such a way that I can easily migrate by using only standard components.
- Everything built on a k8s layer. Maybe Harvester?
- Special attention being paid to security, identity and agents having advanced capabilities but always as secure as possible: Don't give them credentials directly, have predefined roles for agents where we can define fine-grained permissions. Where spending is involved have sensible upper spend limits, always run in sandboxes, control the network.
- In general set up a modern CI/CD toolchain so app credentials are handled correctly, things are well documented, there is proper task management... basically use all modern software dev best practices but have AI use it.
- Use open source where possible. It is a problem that lots of projects in that space start open source and then gate off more and more features behind an enterprise version... so we should choose the best tool for the job and be ready to switch it for something freer in case the devs start gating needed functions too aggressively.
- For me this is also a chance to try open source alternatives: For example, host my own free version control and not take GitHub or GitLab
- We don't want to overdo this. This is still meant as a project that advertises my skills and if I skip the best-of-breed tools and use only unknown little tools instead it is not good.
- I don't want unneeded complexity but especially for stuff like proper CI/CD, proper security and sandboxing, identity management and such I don't want half measures. So while we build step by step, for the design I want to be maximalist in the sense that we don't skip anything. I still want as few tools as possible but only if all needs for the points above are covered. So we start designing a final version of that. We can then make a plan on what to build first and how smaller steps may lead to the big design!
