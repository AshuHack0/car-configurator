# 1. Product overview

MODIFIED lets a car owner or buyer design modifications for a specific car in live 3D, see what it
would cost, and send an enquiry to the studio. It replaces a showroom conversation with a self-serve
experience that ends in a qualified lead.

## Who uses it

| User | Goal | Where |
|---|---|---|
| Customer (anonymous) | Pick their car, try paint, wheels and parts, see a price, save or share the build, enquire | Public website |
| Customer with a photo | Upload photos of their own car to auto-select the model and paint, or see the build on their own car | "Upload your car", "See it for real" |
| Studio staff (admin) | Manage cars, parts and prices; read and follow up enquiries | Admin area (proposed) |

## What works today (frontend)

| Area | Detail |
|---|---|
| Home | Animated intro, scrolling showroom, feature tiles |
| Models | 21 cars across 6 brands (Mercedes-Benz, BMW, Audi, Porsche, Lamborghini, Volvo), brand and body filters, real photos |
| Configurator | Live 3D; paint (7 presets + any custom colour in 4 finishes); 5 wheel designs with finishes; 4 spoilers; front bumpers, rear bumpers, diffuser; 3 side skirts; lights, grille, roof, exhaust, carbon trim |
| Opening parts | Doors, boot/luggage lid and fuel flap open by clicking dots (Volvo S90, Porsche 911 v2) |
| Interior | Seated camera view; 3 seat colours on the Volvo S90 |
| Scenes | Courtyard, Riverside, Plains, Studio, Warm, Cool |
| Price | Live estimated total and a summary list |
| Save / load | One saved build per car, **stored only in this browser** |
| Enquire | **Opens an empty email draft** with the build listed |
| Upload your car | Up to 8 photos; AI identifies make, model, year, paint and existing mods (pilot: Porsche, BMW) |
| See it for real | AI edits a real photo of the car to show the chosen paint and parts |

## Fully 3D cars

| Car | Opens | Interior view | Download | GPU texture memory |
|---|---|---|---|---|
| Volvo S90 (v3) | Doors, boot, fuel flap | Yes, 3 seat colours | 12.5 MB | ~83 MB |
| Porsche 911 Carrera 4S (v2) | Doors, front luggage lid | Yes, simple modelled cabin | 2.1 MB | ~6 MB |
| BMW M4 | — | — | — | — |

The other 18 cars show the closest available 3D body (the M4, the 911 or a generic coupe) with a note
telling the customer.

## Scope

**In scope for the first release**

- Catalogue served from a database and editable by staff
- Saved builds with a shareable link
- Prices calculated on the server (the browser total becomes display-only)
- Enquiries stored in a database, emailed to the studio, visible in an admin inbox
- AI features moved behind the backend with a persistent spending cap

**Out of scope for now**

- Customer accounts and login
- Online payment or booking
- Real-time stock or supplier pricing
- Multiple studios or locations (single tenant)

## Open questions

1. Is the first audience internal, a client pitch, or real customers? This sets the polish level and date.
2. Which cars must be fully 3D at launch, and what is the 3D model budget?
3. Where must enquiries go: email only, or also a CRM (for example HubSpot, Zoho)?
4. Keep both AI photo features, and with what monthly spending limit?
