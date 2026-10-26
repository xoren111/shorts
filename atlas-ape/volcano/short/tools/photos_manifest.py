"""Manifest of archive/documentary photos for public/photos (see SHOTS.md).
Each entry: file, need, src ('commons' | 'url' | 'booklet'), plus source-specific keys and
hand-checked date/place/description taken from the source's own caption."""

USGS_GIP_PAGE = "https://pubs.usgs.gov/publication/70039211"
USGS_GIP_PDF = "https://pubs.usgs.gov/gip/70039211/report.pdf"
GIP_AUTHOR = ("U.S. Geological Survey - booklet 'Man Against Volcano: The Eruption on Heimaey, Vestmann Islands, "
              "Iceland' (USGS INF-75-22, 1976) by Richard S. Williams Jr. and James G. Moore; photographer not credited")
GIP_NOTE = ("Cropped from the USGS scan of the printed 1976 booklet (halftone; light descreen blur applied). "
            "Photo has no photographer credit in the booklet, while the booklet's non-USGS photos are explicitly "
            "credited (e.g. 'courtesy of Solarfilma'); treated as USGS work = public domain.")
PD_US = "https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits"

ITEMS = [
    # ---------------- need 1: Heimaey 1973 ----------------
    dict(file="heimaey_spray_1973.jpg", need="1 Heimaey 1973 - seawater spraying", src="booklet", page=12,
         box=(108, 1454, 1586, 2521),
         title="Seawater sprayed onto the lava flow front, Heimaey harbor",
         date="1973-05-04 (booklet caption prints 'May 4, 1975' - evident misprint; spraying ran 6 Feb-10 Jul 1973)",
         place="Vestmannaeyjar outer harbor, Heimaey, Iceland - view to the south",
         description="Booklet caption: view to the south from Vestmannaeyjar's outer harbor; seawater is being sprayed "
                     "directly onto the lava flow front to arrest infilling of the harbor entrance. Water jets arc onto "
                     "the steaming lava front, pump vessels at the waterline.",
         crop_hint="water jets left-center, pump ships bottom-center; vertical crop around x 35-75%"),
    dict(file="heimaey_pumping_eruption_1973.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov", author="Jack Lockwood, U.S. Geological Survey (photo via Smithsonian Global Volcanism Program)", need="1 Heimaey 1973 - pumping + eruption column", src="commons",
         title="File:The town of Vestmannaeyjar and the harbor during the eruption of Eldfell in 1973.jpg",
         date="1973 (Smithsonian GVP: 'Photo by Jack Lockwood, 1973'; Commons date field 1973-05-01)",
         place="Vestmannaeyjar town and harbor, Heimaey, Iceland",
         description="An ash-laden eruption column rises above the volcanic cone (Eldfell) behind the town; the pumping "
                     "operation in the foreground was designed to cool the front of the advancing lava flow that "
                     "threatened the town and its harbor.",
         note="Low resolution (640 px) - use small / framed.", crop_hint="eruption column center-right"),
    dict(file="heimaey_lava_factories_1973.jpg", need="1 Heimaey 1973 - lava front stopped in town", src="booklet", page=10,
         box=(138, 1588, 1620, 2520),
         title="Lava flow front stopped between two fish-factory buildings",
         date="1973-07-23", place="Dock area, northern Vestmannaeyjar, Heimaey, Iceland - view southeast",
         description="Booklet caption: view on July 23, 1973, southeast from dock area toward edge of lava flow where it "
                     "stopped against and between two fish-factory buildings; two boys sweep up tephra in the right "
                     "background. (USGS OFR 97-724 fig. 22 credits this view to Richard S. Williams Jr., USGS.)",
         crop_hint="lava wall center"),
    dict(file="heimaey_house_lava_1973.jpg", need="1 Heimaey 1973 - house engulfed by lava", src="booklet", page=6,
         box=(106, 1407, 790, 2458),
         title="House engulfed by the March 1973 lava flow",
         date="1973-07-23", place="Eastern part of Vestmannaeyjar, Heimaey, Iceland - view north",
         description="Booklet caption: view on July 23, 1973, north toward a house engulfed by the March lava flow on the "
                     "eastern part of Vestmannaeyjar. (Printed in sepia.)",
         crop_hint="already portrait; house lower-center"),
    dict(file="heimaey_buried_pipes_1973.jpg", need="1 Heimaey 1973 - tephra-buried homes, cooling pipes", src="booklet",
         page=7, box=(142, 1360, 1624, 2530),
         title="Homes partially buried by tephra, cooling pipes, vapor-shrouded Eldfell",
         date="1973-07-23", place="Vestmannaeyjar, Heimaey, Iceland - view southeast",
         description="Booklet caption: view on July 23, 1973, southeast across homes partially buried by tephra. "
                     "Vapor-shrouded Eldfell looms in the distance. Pipes which conveyed seawater to the lava flows cross "
                     "the tephra in the middle ground. Gases rise from the tephra behind the telephone pole.",
         crop_hint="buried house right-center"),
    dict(file="heimaey_buried_houses_1974.jpg", need="1 Heimaey - town buried in tephra (1974)", src="commons",
         title="File:I122 Heimaey buried houses, Aug 1974 (51702853197).jpg",
         date="1974-08 (one and a half years after the eruption)", place="Heimaey, Vestmannaeyjar, Iceland",
         description="Flickr title: 'I122 Heimaey buried houses, Aug 1974'.",
         crop_hint="portrait already; red-roofed houses sunk in black tephra"),
    dict(file="heimaey_buried_houses_1974b.jpg", need="1 Heimaey - town buried in tephra (1974)", src="commons",
         title="File:I117 Heimaey - buried houses beneath new volcano, Aug 1974 (51703930958).jpg",
         date="1974-08", place="Heimaey, Vestmannaeyjar, Iceland",
         description="Flickr title: 'I117 Heimaey - buried houses beneath new volcano, Aug 1974'.",
         crop_hint="houses lower center, Eldfell cone above"),
    dict(file="heimaey_lava_town_1974.jpg", need="1/5 Heimaey - steaming lava field at the town (1974)", src="commons",
         title="File:Heimaey 08.jpg", width=3840,
         date="1974-07-24", place="Heimaey, Vestmannaeyjar, Iceland",
         description="Source: 'Heimaey 1 1/2 Jahre nach Ausbruch des Eldfell' (Heimaey 1.5 years after the Eldfell "
                     "eruption).", crop_hint="blocky new lava foreground, steam + town houses upper half"),
    # ---------------- need 5: Heimaey today ----------------
    dict(file="heimaey_breakwater_2014.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-self", need="5 Heimaey harbor / 1973 lava today", src="commons",
         title="File:Vestmannaeyjar, old breakwater of the harbour reinforced by the eruption in 1973.jpg",
         date="2014-07-29", place="Harbor entrance, Vestmannaeyjar, Heimaey, Iceland",
         description="File title: old breakwater of the harbour reinforced by the eruption in 1973 - the 1973 lava field "
                     "(with Eldfell behind) forms the shelter at the harbor entrance.", crop_hint="lighthouse + lava center-left"),
    dict(file="heimaey_harbor_2012.jpg", need="5 Heimaey harbor today", src="commons",
         title="File:Heimaey Island.jpg",
         date="2012-07-03", place="Heimaey, Vestmannaeyjar, Iceland - from the cliffs north of the harbor",
         description="Source: from the cliffs onto the harbor and town of the island, the new volcano Eldfell in the "
                     "background (panorama).", crop_hint="harbor basin x 35-60%"),
    # ---------------- need 2: Patton ----------------
    dict(file="patton_1943.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Army", author="U.S. Army Signal Corps", need="2 George S. Patton portrait", src="commons", title="File:GeorgeSPatton.jpg",
         date="1943-03-30", place="not given by source",
         description="U.S. Army Signal Corps photo 'George Patton as Lt. General', March 30, 1943 (pictured before his "
                     "promotion to full general).", note="In Dec 1935 he was a lieutenant colonel - label the photo 1943."),
    dict(file="patton_1918.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Army", author="U.S. Army Signal Corps (World War I Signal Corps Photograph Collection)", need="2 George S. Patton (as Lt. Col.)", src="commons",
         title="File:George S. Patton - France - 1918.jpg",
         date="1918 (summer)", place="France",
         description="U.S. Army Signal Corps (WWI collection): Lieut. Col. George S. Patton, Jr., 1st Tank Battalion, "
                     "with a French Renault tank, summer 1918.",
         note="Same rank (Lt. Col.) as in 1935, but a 1918 photo - label honestly.", crop_hint="Patton right-center"),
    # ---------------- need 3: Mauna Loa 1935 ----------------
    dict(file="maunaloa_1935_bombing_1.jpg", need="3 1935 bombing of the Mauna Loa lava flow", src="url",
         url="https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/img7961.jpg",
         page_url="https://www.usgs.gov/media/images/old-bombs-found-mauna-loa-rest-story-part-2",
         title="Aerial view of a bomb detonating on Mauna Loa lava flows",
         author="Army Air Corps, 11th Photo Section (via USGS Hawaiian Volcano Observatory)",
         license="Public domain", license_url=PD_US,
         date="1935-12-27 (print caption: 12-27-35 3:10 P, 13,000 ft, 'Bombing of lava flow, Mauna Loa, Hawaii')",
         place="Near the source of the 1935 Humu'ula lava flow, Mauna Loa, Hawai'i",
         description="USGS: aerial view of a bomb detonating near the source of the 1935 Humu'ula lava flow on the "
                     "morning of December 27, 1935; one of 20 demolition bombs dropped by the Army Bombing Squadron "
                     "from Luke Field, O'ahu.", crop_hint="explosion cloud center; burned-in caption strip at bottom"),
    dict(file="maunaloa_1935_bombing_2.jpg", need="3 1935 bombing of the Mauna Loa lava flow", src="url",
         url="https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/vhp_img5698.jpg",
         page_url="https://www.usgs.gov/media/images/did-aerial-bombing-stop-1935-mauna-loa-lava-flow",
         title="Did aerial bombing stop the 1935 Mauna Loa lava flow?",
         author="Army Air Corps, 11th Photo Section (via USGS Hawaiian Volcano Observatory)",
         license="Public domain", license_url=PD_US,
         date="1935-12-27 (morning)", place="Near the 8,500-ft source of the 1935 lava flow, Mauna Loa, Hawai'i",
         description="USGS: aerial view of a bomb detonating near the 8500-foot elevation source of the 1935 lava flow "
                     "on the morning of December 27, 1935; one of twenty 600-pound bombs dropped that morning by the "
                     "Army Bombing Squadron from Luke Field, O'ahu.", crop_hint="explosion center"),
    dict(file="maunaloa_1935_bomber_bombs.jpg", need="3 1935 Army Air Corps biplane + bombs", src="url",
         url="https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/thumbnails/image/image1-1454.jpg",
         page_url="https://www.usgs.gov/media/images/us-army-air-corps-biplane-prepares-drop-bombs-1935-lava-flow",
         title="U.S. Army Air Corps biplane prepares to drop bombs on 1935 lava flow",
         author="Kenichi Maehara (photographer as listed by USGS)", license="Public domain (as stated by USGS)",
         license_url=PD_US, date="1935 (December, Mauna Loa 1935 eruption)", place="Airfield (not specified by source), Hawai'i",
         description="USGS: a U.S. Army Air Corps biplane is prepared for a mission to drop bombs on a lava flow advancing "
                     "toward Hilo during the Mauna Loa 1935 eruption; below the plane one of the 20 demolition bombs "
                     "(center) and two of the 20 'pointer bombs' (left and right) used for aiming.",
         note="USGS marks it Public Domain but names a photographer (Kenichi Maehara) whose federal status is not stated.",
         crop_hint="bombs bottom, wing/engine top"),
    dict(file="maunaloa_1935_fissure_1.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force", need="3 Mauna Loa 1935 eruption (aerial)", src="commons", nara_crop=True,
         title="File:Hawaii - Mauna Loa - NARA - 23937849.jpg",
         date="1935-11-22 14:00 (print caption: 11-22-35 2:00 P, 12,000 ft, 'Eruption of Mauna Loa, November 21, 1935')",
         place="Mauna Loa, Hawai'i", author="U.S. Army Air Corps aerial photo (card: rec'd from Wheeler Field, T.H., 12/2/35); NARA RG 18 'Airscapes', local id 18-AA-42-9, NAID 23937849",
         description="Army Air Corps oblique aerial photo of the eruption of Mauna Loa that began November 21, 1935: "
                     "steaming eruptive fissure along the slope. Cropped to the print (mount card removed).",
         crop_hint="fuming fissure line upper third"),
    dict(file="maunaloa_1935_fissure_2.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force", need="3 Mauna Loa 1935 eruption (aerial)", src="commons", nara_crop=True,
         title="File:Hawaii - Mauna Loa - NARA - 23937857.jpg",
         date="1935-11-22 14:00 (print caption: 11-22-35 2:00 P, 12,000 ft, 'Eruption of Mauna Loa, November 21, 1935')",
         place="Mauna Loa, Hawai'i", author="U.S. Army Air Corps aerial photo (card: rec'd from Wheeler Field, T.H., 12/2/35); NARA RG 18 'Airscapes', local id 18-AA-42-13, NAID 23937857",
         description="Army Air Corps oblique aerial photo of the November 1935 Mauna Loa eruption: lava channel and "
                     "steaming vents. Cropped to the print (mount card removed).",
         crop_hint="steam plumes right, channel upper-left"),
    dict(file="keystone_b4a_lukefield.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force", author="U.S. Air Force photo (National Museum of the U.S. Air Force, 060421-F-1234P-014)", need="3 1930s Army Air Corps bombers in Hawaii (reference)", src="commons",
         title="File:Keystone B-4As take off from Luke Field Hawaii 060421-F-1234P-014.jpg",
         date="1933", place="Luke Field, Hawaii (Pearl Harbor in the background)",
         description="Three Keystone B-4A bombers of the 72nd or 23rd Bomb Squadrons, 5th Composite Group, take off from "
                     "Luke Field, Hawaii, with Pearl Harbor in the background (the Luke Field units flew the Dec 1935 "
                     "mission).", note="1933 photo, not the 1935 mission itself."),
    dict(file="keystone_b6a_bombing.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force", author="U.S. Air Force photo (National Museum of the U.S. Air Force, 060421-F-1234P-025)", need="3 1930s Army Air Corps biplanes dropping bombs (reference)", src="commons",
         title="File:Keystone B-6As dropping bombs 060421-F-1234P-025.jpg",
         date="1930s", place="(20th Bomb Squadron, 2nd Bomb Group, Langley Field, Virginia - not Hawaii)",
         description="Keystone B-6A bombers dropping bombs; from the 20th Bomb Squadron of the 2nd Bomb Group, based at "
                     "Langley Field, Virginia.", note="Reference only: not Hawaii, not the lava mission."),
    # ---------------- need 4: Etna 1991-93 / Zafferana ----------------
    dict(file="etna_1992_heli_block.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov", author="JO2 Laurie Beers, U.S. Navy (DoD / NARA)", need="4 Etna 1992 - US helicopter drops concrete block onto lava", src="commons",
         title="File:A View from a Helicopter as a Concrete Block is Lowered to Block the Lava Flow.jpg",
         date="1992-04-15", place="Mount Etna lava flow near Zafferana Etnea, Sicily",
         description="US Navy (JO2 Laurie Beers): view from a helicopter as a concrete block is lowered to block the lava "
                     "flowing from Mount Etna near Zafferana Etnea; Navy and Marine personnel used 8,000-pound blocks to "
                     "divert the flow (Operation Hot Rock).", crop_hint="glowing lava channel center-right"),
    dict(file="etna_1992_flow_end_2016.jpg", need="4 Etna 1992 lava flow front near Zafferana (today)", src="commons",
         title="File:Lava flow from 1992 Etna eruption.jpg",
         date="2016-08-10", place="Near Zafferana Etnea, Sicily",
         description="The terminal area of the lava flow from the 1992 eruption of Mount Etna, near Zafferana.",
         crop_hint="portrait already"),
    dict(file="etna_1992_lava_house_2016.jpg", need="4 Etna 1992 - house at the edge of the flow (today)", src="commons",
         title="File:Lava house at Zafferana.jpg",
         date="2016-08-10", place="Zafferana Etnea, Sicily",
         description="The house at the very edge of the lava flow from the 1992 Etna eruption.", crop_hint="house center"),
    dict(file="etna_eruption_2014.jpg", need="4 Etna erupting (2014, label honestly)", src="commons", width=3840,
         title="File:Etna's NSEC (New South East Crater) eruption.jpg",
         date="2014-05-27", place="Mount Etna, Sicily",
         description="Long-exposure night image of a 'dual-vent' eruption from Mount Etna's New South East Crater.",
         crop_hint="glowing vents center"),
    dict(file="zafferana_town_2017.jpg", need="4 Zafferana Etnea town", src="commons", width=3840,
         title="File:Zafferana Etnea 2017-04-27h.jpg",
         date="2017-04-27", place="Zafferana Etnea, Sicily",
         description="Zafferana Etnea, Sicily: main square with the Chiesa Madre.", crop_hint="church left third"),
    # ---------------- need 6: optional ----------------
    dict(file="maunaloa_2022_fissure.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-USGS", author="U.S. Geological Survey (Hawaiian Volcano Observatory)", need="6 Mauna Loa lava (2022, label honestly)", src="commons", width=3840,
         title="File:Mauna Loa fissure eruption and lava flow (111152).jpg",
         date="2022-11-29 (morning)", place="Northeast Rift Zone, Mauna Loa, Hawai'i",
         description="USGS: an erupting fissure high on Mauna Loa's Northeast Rift Zone issuing multiple lava flows; "
                     "fountain heights of 20-25 m measured by HVO field crews; gas plume rising.",
         crop_hint="fountains center"),
    dict(file="hilo_maunaloa_1940.jpg", license_url="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force", need="6 Hilo town + Mauna Loa (archive aerial)", src="commons", nara_crop=True,
         title="File:Hawaii - Hilo - NARA - 23937293.jpg",
         date="1940-12-12 (print caption)", place="Hilo, Hawai'i, with Mauna Loa in the distance",
         author="U.S. Army aerial photo, NARA RG 18 (Records of the Army Air Forces) 'Airscapes', local id 18-AA-37-26, NAID 23937293 (card: orig. neg. rec'd from Hdq., 81st Air Base Group)",
         description="Card caption: 'Hilo and Mauna Loa in distance, Hawaii, T.H., 12 December 1940' - oblique aerial "
                     "of Hilo Bay and town with Mauna Loa on the horizon. Cropped to the print (mount card removed).",
         note="1940, five years after the 1935 eruption.", crop_hint="Hilo bay lower half, Mauna Loa top"),
]
