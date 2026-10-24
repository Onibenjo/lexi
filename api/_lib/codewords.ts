// 256 short, distinct, easy-to-type words for sync codes like `amber-otter-quill-maple-42`.
// Four words plus two digits give about 39 bits, which is plenty behind a rate limit.
export const CODE_WORDS = `
acorn agate alder amber anchor apple apron arbor arrow aspen atlas attic autumn badge bagel bamboo
banjo barley basil basin beacon beech berry birch biscuit blossom bonnet border bramble brass bread breeze
brick bridge brook bubble bucket buckle butter button cabin cactus camel candle canoe canvas canyon carrot
castle cedar cello chalk cherry chess chimney cider cinder clover cobalt cocoa comet copper coral cotton
cradle crane crayon creek cricket crystal cupola dahlia daisy delta denim dingo dolphin dove dune eagle
easel ember emerald falcon feather fennel fern fiddle fig finch fjord flint flora fossil fox garnet
gecko ginger glacier globe goose granite grape gravel grove harbor hazel heron hickory honey hornet husky
igloo indigo iris island ivory ivy jade jasmine jelly jungle kayak kelp kettle kiwi koala ladder
lagoon lantern larch lark lemon lily linen lotus lunar magnet mango maple marble meadow melon mint
mitten moss muffin nectar nickel nutmeg oak oasis ocean olive onyx orbit orchid otter owl oyster
paddle panda papaya parrot pebble pecan pepper petal piano pickle pigeon pine plover plum pocket pollen
pony poppy prairie pretzel puffin pumpkin quail quartz quill quilt rabbit radish raven reef ribbon river
robin rocket rose ruby saddle saffron sage salmon sandal satin scarf seal sequoia shell sierra silver
sparrow spruce squash star stone stork summit swan tango teapot thistle thyme tiger timber toast topaz
tulip tundra turnip velvet violet walnut walrus willow window wren yarrow yogurt zebra zephyr zinnia
compass lichen marlin mesa alpine bison clove dewdrop elm fawn gull hawk ibis juniper kale lynx meteor
`
  .trim()
  .split(/\s+/)
