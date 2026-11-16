"""Раскладывает subjects датасета по детским игровым категориям.

Консервативно: всё, что не совпало с категорией, или совпало со стоп-листом — исключается.
Выход: data/subjects_classified.json  {subject: {"cat": ..., "tags": [...]}}
"""
import json
import re
import sys
from collections import Counter, defaultdict

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."

# --- стоп-лист по словам в названии subject (целые слова) ---
BLOCK_WORDS = set("""
sword swords axe axes gun guns pistol rifle shotgun revolver musket bomb bombs grenade dynamite knife knives
dagger spear lance halberd mace flail whip trident scythe sickle machete katana scimitar cutlass rapier
arrow arrows crossbow bow-and-arrow quiver cannon cannonball ammo bullet bullets missile rocket-launcher
skull skulls skeleton bone bones coffin grave tombstone gravestone zombie demon devil ghoul vampire
werewolf mummy corpse blood bloody poison poisoned venom toxic cursed curse evil undead lich reaper
monster beast war warrior soldier knight guard assassin bandit pirate executioner tank warship
cigarette cigar tobacco pipe beer wine whiskey vodka rum liquor ale mead cocktail champagne sake
syringe needle pill pills scalpel handcuffs trap bear-trap noose chainsaw saw drill razor
spiked spikes barbed shuriken nunchaku brass-knuckles club warhammer battleaxe glaive morningstar
gauntlet armor armour helmet chainmail shield cuirass greaves pauldron
golem elemental giant ogre troll goblin orc kraken dragon hydra wyrm basilisk cockroach rat spider
scorpion leech wasp hornet tick worm maggot slug snake viper cobra shark piranha
grenade landmine mine explosive tnt fuse gunpowder detonator
insignia flag banner icon symbol marker sign rune emblem

# --- точечные ложные срабатывания (найдены по отчёту) ---
bandage tape film toilet cutter grater masher incubator badger machine cart vendor iron tin peel spinner tongs
server churn mill shaker wrapper century hardtack
armored plate mail archer's chips bomber flak combat tactical iv punching trash fertilizer hex claw horned
shockwave binder stealth studded medical doctor doctor's boxing
artillery mortar casing dungeon mimic soul void shadow fang eye eyeball eyes serpent spacebar shift enter data
harpy raven wolf
breast nuggets tenders wing tandoori tagine chop leg peking corn-dog shears ghost terror dire acid lava
thunder computer python antler tag stamp wax tentacle rogue person idol totem mask fossil fish-and-chips
antidote cough medicine chamber detergent beetles eyeballs leeches spiders teeth embers carrier leggings
vambrace pressure weight shampoo polish ink spray reagent specimen witch trophy keyhole casting tuning coffee
espresso cappuccino latte mocha cider glue oil
dead haunted petrified uprooted fallen death blower insect skewer forge coal
vise heat hospital walker plunger barred vault cellar
chain bearing gown lightning cheddar feta beeswax cinder cobblestone carving sandstone stone brick salt swage
tofu mozzarella dough plasma referee steam scribble carpenter crumpled
army cement crane garbage tanker tow semi freight gravy battery lock hand-plane hand-truck
magazine alarm amplifier summoning bell-bottom oil-drum
""".split())

# --- стоп-слова в подписи (caption) конкретного спрайта ---
BLOCK_CAPTION = re.compile(
    r"\b(cursed|broken|burnt|burned|rotten|rotting|bloody|blood|skull|skulls|poison|poisoned|dead|"
    r"moldy|mouldy|demonic|evil|haunted|spiked|spikes|bone|bones|toxic|decayed|decaying|creepy|"
    r"cracked|shattered|smashed|torn|dented|rusty|rusted|chipped|withered|wilted|dirty|grimy|"
    r"sinister|menacing|angry|fanged|fangs|claws|horned|scary|ominous|eerie|gory|wound|"
    r"weapon|blade|knife|sword|gun|bomb|fire|flames|burning|smoke|smoking)\b",
    re.I,
)

# --- категории: (категория, игровые теги, ключевые слова) ---
# порядок важен: первая подходящая категория побеждает
CATEGORIES = [
    ("animal", ["pet", "living"], """
        cat kitten dog puppy bunny rabbit hamster owl bird chick duck duckling penguin parrot frog turtle
        fish goldfish butterfly ladybug bee snail hedgehog fox bear panda koala unicorn pony horse
        lamb sheep pig piglet cow mouse squirrel deer raccoon otter seal whale dolphin octopus
        jellyfish starfish crab seahorse slime chicken hen flamingo swan sparrow robin bluebird
        caterpillar firefly axolotl kitty
    """),
    ("drink", ["edible", "drink"], """
        juice milk milkshake smoothie lemonade tea cocoa hot-chocolate soda boba
    """),
    ("food", ["edible"], """
        apple banana cherry cherries strawberry strawberries grape grapes pear peach orange lemon lime
        watermelon melon pineapple mango kiwi coconut plum blueberry blueberries raspberry berries berry
        carrot tomato potato corn pumpkin cucumber broccoli pea peas onion pepper eggplant radish lettuce
        cabbage beet avocado bread baguette croissant bun cinnamon-roll swiss-roll dinner-roll spring-roll toast pancake pancakes waffle muffin
        cupcake cake pie cookie cookies donut doughnut macaron cinnamon pretzel bagel biscuit
        candy lollipop chocolate gummy marshmallow cotton-candy jelly pudding ice-cream popsicle
        sundae cream cheese egg eggs omelet sandwich burger hamburger hotdog hot-dog pizza taco
        sushi noodles pasta spaghetti rice soup salad dumpling dumplings fries popcorn honey jam
        butter yogurt cereal porridge acorn peanut almond crumble tart sweet sweets dessert
        candies taffy fudge caramel mochi onigiri meatball sausage drumstick
    """),
    ("kitchen", ["kitchen", "container"], """
        pot pan frying-pan kettle teapot teacup cup mug plate bowl jar jug pitcher spoon fork ladle
        whisk spatula rolling-pin cutting-board oven stove toaster blender fridge refrigerator
        lunchbox basket bottle thermos saucer tray cookie-jar
    """),
    ("furniture", ["furniture"], """
        chair stool table desk bed sofa couch armchair bench shelf bookshelf bookcase wardrobe dresser
        cabinet drawer drawers rug carpet pillow cushion blanket mirror clock vase lamp lantern candle
        candlestick chandelier curtain window door fireplace bathtub sink toilet crib cradle
        hammock beanbag nightstand frame painting picture-frame houseplant plant-pot flowerpot
    """),
    ("clothing", ["wearable"], """
        hat cap beanie beret bonnet dress skirt shirt t-shirt sweater hoodie jacket coat scarf
        mittens gloves glove socks sock shoes shoe boots boot sandals sneakers slippers pajamas
        tiara crown hairbow hairclip hair-clip headband necklace bracelet ring earrings earring
        pendant locket brooch glasses sunglasses backpack purse handbag bag tutu apron raincoat
        umbrella bow-tie ribbon
    """),
    ("toy", ["toy"], """
        ball beach-ball balloon kite doll teddy teddy-bear plush yo-yo yoyo top spinning-top
        blocks building-block puzzle rattle jump-rope skipping-rope rubber-duck toy whistle marble marbles
        dice domino dominoes jack-in-the-box music-box pinwheel bubble bubbles crayon crayons
        paintbrush paint palette sticker stickers pencil colored-pencils
    """),
    ("music", ["music"], """
        drum guitar piano violin flute trumpet xylophone tambourine harp ukulele bell maracas
        harmonica triangle accordion
    """),
    ("garden", ["plant", "living"], """
        flower flowers rose tulip daisy sunflower lily lotus orchid bouquet cactus succulent
        tree bush shrub sapling seedling sprout seeds seed leaf clover mushroom vine fern
        watering-can shovel rake wheelbarrow beehive birdhouse
    """),
    ("magic", ["magic"], """
        potion wand crystal gem gemstone jewel diamond ruby emerald sapphire amethyst orb star
        moon sun rainbow cloud snowflake heart magic fairy feather shell seashell pearl coin
        treasure chest key charm amulet scroll book spellbook crystal-ball snowglobe snow-globe
        hourglass compass map
    """),
    ("vehicle", ["toy", "vehicle"], """
        car bicycle bike scooter train boat sailboat bus truck tractor airplane plane helicopter
        balloon hot-air-balloon skateboard sled wagon
    """),
]

KEYWORDS = {}
for cat, tags, words in CATEGORIES:
    for w in words.split():
        KEYWORDS.setdefault(w, (cat, tags))


def tokens(subject):
    s = subject.lower()
    parts = re.findall(r"[a-z]+", s)
    # одиночные слова + биграммы через дефис ("ice cream" -> "ice-cream")
    bigrams = [f"{a}-{b}" for a, b in zip(parts, parts[1:])]
    trigrams = [f"{a}-{b}-{c}" for a, b, c in zip(parts, parts[1:], parts[2:])]
    return parts, bigrams + trigrams + [s.replace(" ", "-")]


def classify(subject):
    words, multi = tokens(subject)
    if any(w in BLOCK_WORDS for w in words + multi):
        return None
    if "potion" in words or "elixir" in words:
        return ("magic", ["magic", "potion"])
    # "голова" названия обычно последнее слово ("strawberry cake" -> cake), поэтому идём с конца
    for w in reversed(multi):
        if w in KEYWORDS:
            return KEYWORDS[w]
    for w in reversed(words):
        if w in KEYWORDS:
            return KEYWORDS[w]
    return None


def main():
    objs = json.load(open(f"{ROOT}/data/raw/objects.json"))
    counts = Counter(objs)
    out, by_cat = {}, defaultdict(list)
    for subj in sorted(counts):
        r = classify(subj)
        if r:
            cat, tags = r
            out[subj] = {"cat": cat, "tags": tags}
            by_cat[cat].append(subj)
    json.dump(out, open(f"{ROOT}/data/subjects_classified.json", "w"), indent=1, ensure_ascii=False)
    print(f"kept {len(out)} of {len(counts)} subjects")
    for cat, subs in sorted(by_cat.items(), key=lambda x: -len(x[1])):
        print(f"\n== {cat} ({len(subs)})\n" + "; ".join(subs))


if __name__ == "__main__":
    main()
