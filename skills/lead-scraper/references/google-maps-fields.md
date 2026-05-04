# Google Maps Fields Reference

Fields extracted by the Barty-Bart scraper and their mapping to the `leads` table.

## Field Mapping

| Google Maps Field | Supabase Column | Notes |
|---|---|---|
| `place_id` | `place_id` | Unique ID — dedup key |
| `name` | `name` | Business display name |
| `formatted_address` | `address` | Full address string |
| `formatted_phone_number` | `phone` | Local format |
| `website` | `website` | May be null |
| `rating` | `rating` | 1.0–5.0 |
| `user_ratings_total` | `reviews_count` | Integer |
| `types` | `niche` | Mapped to niche category |

## Fields Detected Post-Scrape

| Field | Detection Method |
|---|---|
| `has_website` | `website !== null` |
| `website_status` | HTTP HEAD request (live / dead) |
| `email` | Parsed from website contact page or Maps listing |
| `has_professional_email` | Email domain not in public list |
| `instagram_url` | Found in Maps listing social links |
| `facebook_url` | Found in Maps listing social links |

## Franchise Detection Keywords

Skip any business whose name contains:
`mcdonald`, `starbucks`, `walmart`, `cvs`, `walgreens`, `aspen dental`, `heartland dental`, `western dental`, `comfort dental`, `bank of america`, `chase`, `subway`, `dunkin`

## Niche Search Queries

| Niche | Google Maps Query |
|---|---|
| Dentist | `dentist in {city}` |
| Aesthetic Clinic | `aesthetic clinic OR med spa OR skin clinic in {city}` |
| Boutique Hotel | `boutique hotel in {city}` |
| Local Service | `{service_type} in {city}` (e.g. plumber, electrician, HVAC) |
