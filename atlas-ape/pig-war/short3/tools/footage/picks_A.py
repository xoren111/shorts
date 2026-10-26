"""Group A (pig shots) picks -> picks_A.json for cut.py.  python3 -E picks_A.py"""
import json, os

PXL = {"licence": "Pexels License (free for commercial use, no attribution required)",
       "licence_url": "https://www.pexels.com/license/"}
PXB = {"licence": "Pixabay Content License (free for commercial use, no attribution required)",
       "licence_url": "https://pixabay.com/service/license-summary/"}

WM = {"page": "https://commons.wikimedia.org/wiki/File:Pigs_Love_Watermelon.webm",
      "url": "https://upload.wikimedia.org/wikipedia/commons/6/67/Pigs_Love_Watermelon.webm",
      "title": "Pigs Love Watermelon", "author": "Two Drs Homestead (YouTube, via Wikimedia Commons)",
      "author_url": "https://www.youtube.com/@twodrshomestead",
      "licence": "CC BY 3.0", "licence_url": "https://creativecommons.org/licenses/by/3.0",
      "attribution": "\"Pigs Love Watermelon\" by Two Drs Homestead, CC BY 3.0, via Wikimedia Commons",
      "attribution_required": True, "youtube_original": "https://www.youtube.com/watch?v=RY_8iRuQ7GQ"}
P72323 = {"page": "https://pixabay.com/videos/wool-pig-pig-piglet-agriculture-72323/",
          "url": "https://cdn.pixabay.com/video/2021/04/26/72323-541904817_large.mp4",
          "title": "Wool Pig, pig, piglet (Pixabay 72323)", "author": "RoyBuri",
          "author_url": "https://pixabay.com/users/royburi-3128024/", **PXB}
P72320 = {"page": "https://pixabay.com/videos/wool-pig-pig-piglet-livestock-72320/",
          "url": "https://cdn.pixabay.com/video/2021/04/26/72320-541904810_large.mp4",
          "title": "Wool Pig, pig, piglet (Pixabay 72320)", "author": "RoyBuri",
          "author_url": "https://pixabay.com/users/royburi-3128024/", **PXB}
P176712 = {"page": "https://pixabay.com/videos/pig-pork-mammal-animal-park-176712/",
           "url": "https://cdn.pixabay.com/video/2023/08/18/176712-856056300_large.mp4",
           "title": "Pig, Pork, Mammal (Pixabay 176712)", "author": "Kaffeesüchtig",
           "author_url": "https://pixabay.com/users/kaffeesüchtig-19168820/", **PXB}
X28190229 = {"page": "https://www.pexels.com/video/papa-28190229/",
             "url": "https://videos.pexels.com/video-files/28190229/12322386_1920_1080_30fps.mp4",
             "title": "papa", "author": "Antonio Tique",
             "author_url": "https://www.pexels.com/@antonio-tique-1658244228/", **PXL}
X7312343 = {"page": "https://www.pexels.com/video/people-harvesting-potato-7312343/",
            "url": "https://videos.pexels.com/video-files/7312343/7312343-hd_1920_1080_25fps.mp4",
            "title": "People Harvesting Potato", "author": "Rizo Zori",
            "author_url": "https://www.pexels.com/@rizo-zori-41368706/", **PXL}
X30484795 = {"page": "https://www.pexels.com/video/pigs-grazing-outdoors-in-rural-oslo-30484795/",
             "url": "https://videos.pexels.com/video-files/30484795/13063122_3840_2160_24fps.mp4",
             "title": "Pigs Grazing Outdoors in Rural Oslo", "author": "Dominik Gryzbon",
             "author_url": "https://www.pexels.com/@gryziu/", **PXL}
X26775351 = {"page": "https://www.pexels.com/video/a-wild-boar-digging-in-the-dirt-26775351/",
             "url": "https://videos.pexels.com/video-files/26775351/12005052_3840_2160_30fps.mp4",
             "title": "A wild boar digging in the dirt", "author": "Mika Mark",
             "author_url": "https://www.pexels.com/@mika-mark-51669800/", **PXL}
X37659261 = {"page": "https://www.pexels.com/video/farm-pig-roaming-freely-outdoors-37659261/",
             "url": "https://videos.pexels.com/video-files/37659261/15964166_3840_2160_25fps.mp4",
             "title": "Farm Pig Roaming Freely Outdoors", "author": "Magda Ehlers",
             "author_url": "https://www.pexels.com/@magda-ehlers-pexels/", **PXL}
X37659262 = {"page": "https://www.pexels.com/video/peaceful-pig-relaxing-in-warm-sunlight-37659262/",
             "url": "https://videos.pexels.com/video-files/37659262/15964182_3840_2160_25fps.mp4",
             "title": "Peaceful Pig Relaxing in Warm Sunlight", "author": "Magda Ehlers",
             "author_url": "https://www.pexels.com/@magda-ehlers-pexels/", **PXL}
X27046428 = {"page": "https://www.pexels.com/video/a-pig-is-eating-grass-in-the-grass-27046428/",
             "url": "https://videos.pexels.com/video-files/27046428/12055694_3840_2160_25fps.mp4",
             "title": "A pig is eating grass in the grass", "author": "Magda Ehlers",
             "author_url": "https://www.pexels.com/@magda-ehlers-pexels/", **PXL}

UHD = (1215, 2160)  # full-height 9:16 window in a 3840x2160 source
HD = (608, 1080)    # full-height 9:16 window in a 1920x1080 source


def P(name, src, meta, t0, t1, crop, desc, **kw):
    sid = name.split("_")[0]
    d = {"name": name, "id": sid, "src": f"assets/raw/A/{src}", "t0": t0, "t1": t1, "crop": list(crop),
         "meta": {**meta, "desc": desc}}
    d["meta"].update(kw)
    return d


picks = [
    P("H3", "commons-Pigs_Love_Watermelon/src.webm", WM, 16.24, 18.45, (0, 0, 2160, 3840),
      "Muddy ginger-and-grey farm pig walks right up to the lens chewing watermelon, mouth open, tongue out, "
      "looking straight into camera (vertical phone shot).",
      note="Only 2.2 s: the source cuts at 16.22 s and the pig bumps the lens after 18.5 s. "
           "Best 1.5 s: clip 0.0-1.5 (approach + chewing) or 0.4-1.9 (closest, tongue)."),
    P("H3_alt1", "pexels-27046428/src.mp4", X27046428, 1.0, 7.0, (1121, 0, *UHD),
      "Ginger spotted piglet grazing head-on toward the camera, chewing grass, sunny lawn (4K)."),
    P("A2", "commons-Pigs_Love_Watermelon/src.webm", WM, 3.6, 9.6, (0, 0, 2160, 3840),
      "Same watermelon pigs as H3: extreme close-up munching watermelon; at clip 2.1-2.6 s the pig lifts its "
      "wet snout right into the lens (sniff), then goes back to eating.",
      note="Callback to H3 (same video, different shot). Snout-in-lens moment = source 5.7-6.2 s."),
    P("A2_alt1", "pixabay-72320/src.mp4", P72320, 2.5, 7.5, (1313, 0, *UHD),
      "Low ground-level shot: curly black-and-tan Mangalica 'wool pigs' walk up and sniff the camera, blue sky."),
    P("F1", "pixabay-72323/src.mp4", P72323, 4.0, 10.0, (2158, 0, *UHD),
      "Ground-level close-up: spotted farm pigs rooting and digging in loose field soil with their snouts, "
      "blue sky behind (4K)."),
    P("F1_alt1", "pexels-26775351/src.mp4", X26775351, 6.0, 12.0, (1000, 0, *UHD),
      "Close-up of a (wild) boar rooting its snout deep into dark garden soil (4K)."),
    P("F2", "pexels-28190229/src.mp4", X28190229, 0.0, 5.37, (100, 0, *HD),
      "Low-angle close-up of freshly dug red potatoes lying in dark soil, hills and cloudy sky behind "
      "(farmer kept out of the 9:16 window)."),
    P("F2_alt1", "pexels-7312343/src.mp4", X7312343, 30.3, 35.0, (700, 0, *HD),
      "Close: gloved hand picks yellow potatoes out of dark soil into a red net, more tubers lying around."),
    P("F2_alt2", "pexels-30484795/src.mp4", X30484795, 8.0, 14.0, (1236, 0, *UHD),
      "Pink farm pig munching vegetable scraps on garden soil, head close to camera (4K)."),
    P("F5", "pixabay-176712/src.mp4", P176712, 0.3, 7.3, (1198, 0, *UHD),
      "Frontal close-up of a black pig standing in the sun, looking straight into the camera (4K)."),
    P("F5_alt1", "pexels-37659261/src.mp4", X37659261, 0.0, 4.5, (1198, 0, *UHD),
      "Black-and-white pot-bellied pig trots straight toward the camera across a sunny sand yard (4K)."),
    P("E1", "pexels-37659261/src.mp4", X37659261, 9.0, 16.4, (1536, 0, *UHD),
      "Same black-and-white pot-bellied pig lying calmly on warm sand, head on the right, almost static (4K)."),
    P("E1_alt1", "pexels-37659262/src.mp4", X37659262, 8.0, 16.0, (960, 0, *UHD),
      "Same pig asleep in the sun, close-up of its face; a little bird hops by its belly (4K)."),
]

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "picks_A.json")
json.dump(picks, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(out, len(picks))
