# THEMES.md — Website Theme & Font System for Igil

> Igil uses this file to select a unique visual identity per business.
> Niche → theme family, then vary by city and business name hash.

---

## Theme Selection Logic

```python
import hashlib

def select_theme(niche, business_name, city):
    seed = hashlib.md5(f"{business_name}{city}".encode()).hexdigest()
    index = int(seed[:4], 16) % 100
    family = NICHE_THEME_FAMILIES.get(niche.lower(), "neutral")
    return {
        "theme":        THEME_FAMILIES[family][index % len(THEME_FAMILIES[family])],
        "font_pairing": FONT_PAIRINGS[family][index % len(FONT_PAIRINGS[family])],
        "hero_variant": HERO_VARIANTS[index % len(HERO_VARIANTS)],
        "section_order": SECTION_ORDERS[index % len(SECTION_ORDERS)],
    }
```

---

## Niche → Theme Family

```python
NICHE_THEME_FAMILIES = {
    "plumber":"trades","hvac":"trades","electrician":"trades",
    "roofer":"trades","handyman":"trades","contractor":"trades",
    "landscaper":"nature","lawn care":"nature",
    "auto repair":"industrial","auto detailing":"industrial",
    "salon":"elegant","barbershop":"elegant","spa":"elegant",
    "restaurant":"warm","cafe":"warm","bakery":"warm","catering":"warm",
    "cleaning":"fresh","maid service":"fresh",
    "dentist":"clinical","chiropractor":"clinical",
    "lawyer":"corporate","accountant":"corporate",
}
```

---

## Theme Families

```python
THEME_FAMILIES = {
    "trades":      ["slate-blue","navy-orange","charcoal-gold","steel-red","midnight-teal"],
    "nature":      ["forest-cream","sage-stone","earth-amber","pine-white"],
    "industrial":  ["gunmetal-yellow","black-red","dark-chrome","concrete-orange"],
    "elegant":     ["rose-gold","blush-charcoal","ivory-plum","nude-bronze","lavender-slate"],
    "warm":        ["terracotta-cream","burgundy-tan","olive-white","rust-sand"],
    "fresh":       ["sky-white","mint-charcoal","aqua-slate","teal-white"],
    "clinical":    ["ocean-white","periwinkle-light","cobalt-cream"],
    "corporate":   ["navy-white","charcoal-blue","dark-gold","forest-cream"],
}

FONT_PAIRINGS = {
    "trades":    [{"heading":"Roboto Slab","body":"Inter"},
                  {"heading":"Oswald","body":"Source Sans Pro"},
                  {"heading":"Barlow","body":"Open Sans"}],
    "nature":    [{"heading":"Lora","body":"Nunito"},
                  {"heading":"Merriweather","body":"Open Sans"}],
    "industrial":[{"heading":"Bebas Neue","body":"Roboto"},
                  {"heading":"Anton","body":"Open Sans"}],
    "elegant":   [{"heading":"Playfair Display","body":"Lato"},
                  {"heading":"Cormorant","body":"Montserrat"},
                  {"heading":"DM Serif Display","body":"DM Sans"}],
    "warm":      [{"heading":"Fraunces","body":"Nunito Sans"},
                  {"heading":"Zilla Slab","body":"Open Sans"}],
    "fresh":     [{"heading":"Nunito","body":"Inter"},
                  {"heading":"Poppins","body":"Lato"}],
    "clinical":  [{"heading":"Montserrat","body":"Open Sans"}],
    "corporate": [{"heading":"Merriweather","body":"Source Sans Pro"},
                  {"heading":"Lora","body":"Inter"}],
}

HERO_VARIANTS = [
    "hero-centered-image","hero-split-left","hero-split-right",
    "hero-fullbleed","hero-stats-banner","hero-minimal",
]

SECTION_ORDERS = [
    ["hero","services","about","testimonials","contact","footer"],
    ["hero","testimonials","services","about","contact","footer"],
    ["hero","services","about","faq","testimonials","contact","footer"],
    ["hero","about","services","testimonials","contact","footer"],
]
```

---

## Notes for Igil

- Pass theme, font, hero variant, and section order into every Codex prompt explicitly
- Never use the same theme+font+hero combination twice per niche — track in `niche_research.design_notes`
- Store build choices in `businesses.build_theme`, `build_font`, `build_hero` for reproducibility
