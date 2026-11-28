"""Light postcard-style preview covers for project and journal cards (1920x1080 PNG + WebP).

Matches the Service Desk Home Lab postcards: #eef1f5 ground, blue eyebrow, dark title,
grey subtitle, name block top right, footer line. The right side is an abstract diagram only.
Run from landing/:  python3 scripts/make_light_covers.py
"""
import asyncio, os
from PIL import Image

FONT = '/workspace/work/li_services_media/fonts/Inter.ttf'
OUT = 'public/covers'
BLUE, INK, MUTE, LINE = '#0f6cbd', '#111827', '#9aa6b8', '#c9d1de'

# slug, eyebrow, title, subtitle (verbatim from the card copy), footer right, visual
COVERS = [
    ('project-entra-sssd', 'IAM', 'Entra ID sign in for Debian with SSSD',
     'Users sign in with the device code flow, with MFA and Conditional Access applied on every Linux sign-in.',
     'github.com/dhruv-setty', 'nodes'),
    ('project-bau-lab', 'HOMELAB', 'IT support home lab',
     'Each fix is written up as a runbook', 'github.com/dhruv-setty', 'stack'),
    ('project-iiq-legacy-fs', 'IGA', 'Identity governance for legacy Linux file shares',
     'Certification marks every account and path as match, excess, missing or divergent.',
     'github.com/dhruv-setty', 'tree'),
    ('project-pcie-dma-tlb', 'HARDWARE', 'PCIe, DMA and TLB hardware with formal checks',
     'A TLA+ shootdown model shows no core keeps a translation to a freed frame.',
     'github.com/dhruv-setty', 'grid'),
    ('project-stage2-tlb', 'FORMAL', 'Stage 2 translation and TLB maintenance',
     'TLC confirms the required unmap order and shows both alternatives lead to use-after-free.',
     'github.com/dhruv-setty', 'layers'),
    ('project-spde-gmrf', 'EMBEDDED', 'Driver-state detection from lane keeping on a microcontroller',
     'Classifies driver state from lane position on a Cortex-M4F', '', 'flow'),
    ('post-hidden-states-behavioural-time-series', 'JOURNAL · TIME SERIES',
     'Hidden States: Modelling Driver Behaviour with Regimes, Drift and a Forward Filter',
     'Switching HMM over four behavioural regimes coupled to a GMRF drift field', '', 'flow'),
    ('post-zero-trust-in-silicon-cobalt-200-neoverse-gdpr', 'JOURNAL · SECURITY',
     'Zero Trust Starts in the Silicon: Cobalt 200, Neoverse V3 and GDPR',
     'default memory encryption and ARM CCA realm isolation move the zero-trust boundary below the hypervisor',
     '', 'rings'),
    ('post-from-intent-to-evidence', 'JOURNAL · IDENTITY',
     'From Intent to Evidence: Identity Controls That Leave Proof',
     'CI captures for two components', '', 'nodes'),
    ('post-lifting-spde-gmrf-gpu-edge', 'JOURNAL · EDGE ML',
     'Driver-State Detection on a Microcontroller: Heavy Fitting on the Host, an Int8 Classifier on the Device',
     'A Cortex-M4F classifies driver state from lane position', '', 'grid'),
]


def visual(kind):
    s = f'stroke="{LINE}" stroke-width="4" fill="none"'
    if kind == 'nodes':
        pts = [(120, 300), (330, 140), (330, 460), (560, 300), (560, 80), (560, 520)]
        edges = [(0, 1), (0, 2), (1, 3), (2, 3), (1, 4), (2, 5), (3, 4), (3, 5)]
        g = ''.join(f'<line x1="{pts[a][0]}" y1="{pts[a][1]}" x2="{pts[b][0]}" y2="{pts[b][1]}" {s}/>' for a, b in edges)
        g += ''.join(f'<circle cx="{x}" cy="{y}" r="{44 if i == 0 else 32}" fill="{BLUE if i == 0 else "#fff"}" stroke="{BLUE if i == 0 else LINE}" stroke-width="4"/>' for i, (x, y) in enumerate(pts))
        return g
    if kind == 'stack':
        return ''.join(f'<rect x="{90 + i * 20}" y="{70 + i * 120}" width="{460 - i * 40}" height="92" rx="16" fill="{"#dbe7f6" if i == 0 else "#fff"}" stroke="{BLUE if i == 0 else LINE}" stroke-width="4"/>'
                       f'<circle cx="{140 + i * 20}" cy="{116 + i * 120}" r="10" fill="{BLUE if i == 0 else LINE}"/>' for i in range(4))
    if kind == 'tree':
        g = f'<rect x="240" y="40" width="140" height="80" rx="14" fill="{BLUE}"/>'
        for i, x in enumerate([50, 250, 450]):
            g += f'<path d="M310 120 V180 H{x + 60} V240" {s}/><rect x="{x}" y="240" width="120" height="74" rx="12" fill="#fff" stroke="{LINE}" stroke-width="4"/>'
            for j in range(2):
                g += f'<path d="M{x + 60} 314 V{370 + j * 100} H{x + 100}" {s}/><rect x="{x + 100}" y="{346 + j * 100}" width="70" height="48" rx="10" fill="#fff" stroke="{LINE}" stroke-width="4"/>'
        return g
    if kind == 'grid':
        g = f'<rect x="100" y="60" width="480" height="480" rx="28" fill="#fff" stroke="{LINE}" stroke-width="4"/>'
        for r in range(4):
            for c in range(4):
                on = (r, c) in [(1, 1), (1, 2), (2, 1), (2, 2)]
                g += f'<rect x="{150 + c * 100}" y="{110 + r * 100}" width="80" height="80" rx="12" fill="{"#dbe7f6" if on else "#f4f6fa"}" stroke="{BLUE if on else LINE}" stroke-width="3"/>'
        for k in range(6):
            p = 140 + k * 80
            g += f'<line x1="{p}" y1="20" x2="{p}" y2="60" {s}/><line x1="{p}" y1="540" x2="{p}" y2="580" {s}/>'
        return g
    if kind == 'layers':
        g = ''
        for i in range(3):
            y = 120 + i * 140
            g += f'<path d="M320 {y} L560 {y + 70} L320 {y + 140} L80 {y + 70} Z" fill="{"#dbe7f6" if i == 0 else "#fff"}" stroke="{BLUE if i == 0 else LINE}" stroke-width="4" opacity="{1 - i * 0.15}"/>'
        return g
    if kind == 'flow':
        g = f'<path d="M60 380 C180 380 200 160 320 160 S460 420 600 300" stroke="{BLUE}" stroke-width="6" fill="none"/>'
        g += f'<path d="M60 460 C200 460 240 300 340 300 S480 480 600 420" {s}/>'
        g += ''.join(f'<circle cx="{x}" cy="{y}" r="16" fill="#fff" stroke="{BLUE}" stroke-width="5"/>' for x, y in [(60, 380), (320, 160), (600, 300)])
        g += f'<line x1="40" y1="540" x2="620" y2="540" {s}/>'
        return g
    if kind == 'rings':
        g = ''.join(f'<circle cx="320" cy="300" r="{r}" fill="none" stroke="{LINE}" stroke-width="4"/>' for r in (250, 180, 110))
        g += f'<circle cx="320" cy="300" r="52" fill="{BLUE}"/>'
        g += ''.join(f'<circle cx="{x}" cy="{y}" r="14" fill="#fff" stroke="{BLUE}" stroke-width="4"/>' for x, y in [(320, 50), (500, 425), (140, 425), (430, 300)])
        return g
    return ''


CSS = '''@font-face{font-family:Inter;src:url(file://%s)}*{margin:0;padding:0;box-sizing:border-box}
body{width:1920px;height:1080px;background:#eef1f5;font-family:Inter,sans-serif;color:%s;position:relative;overflow:hidden}
.who{position:absolute;right:72px;top:52px;text-align:right}.who b{display:block;font-size:19px}.who span{font-size:14px;color:#6b7280}
.txt{position:absolute;left:72px;top:0;bottom:0;width:1080px;display:flex;flex-direction:column;justify-content:center}
.k{font-size:30px;font-weight:700;letter-spacing:4px;color:%s}
.t{font-weight:750;letter-spacing:-2px;line-height:1.04;margin-top:22px}
.s{font-size:34px;line-height:1.35;color:#4b5563;margin-top:30px;max-width:1000px}
.vis{position:absolute;right:110px;top:240px;width:640px;height:600px}
.ft{position:absolute;left:72px;right:72px;bottom:40px;display:flex;justify-content:space-between;font-size:20px;color:#6b7280}
''' % (FONT, INK, BLUE)


async def main():
    from playwright.async_api import async_playwright
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        for slug, eyebrow, title, sub, foot, kind in COVERS:
            size = 92 if len(title) < 50 else 76 if len(title) < 75 else 64
            html = f'''<html><head><style>{CSS}</style></head><body>
<div class="who"><b>Dhruv Setty</b><span>IT Support &amp; Identity Administration · Auckland</span></div>
<div class="txt"><div class="k">{eyebrow}</div><div class="t" style="font-size:{size}px">{title}</div><div class="s">{sub}</div></div>
<svg class="vis" viewBox="0 0 640 600">{visual(kind)}</svg>
<div class="ft"><span>dhruv-setty.github.io</span><span>{foot}</span></div>
</body></html>'''
            await pg.set_content(html)
            await pg.wait_for_timeout(150)
            png = f'{OUT}/{slug}.png'
            await pg.screenshot(path=png)
            Image.open(png).save(png[:-4] + '.webp', 'WEBP', quality=86)
        await b.close()


asyncio.run(main())
print('ok', len(COVERS))
