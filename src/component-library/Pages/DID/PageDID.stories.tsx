import { StoryFn, Meta } from "@storybook/react";
import { PageDID as PD } from "./PageDID";

import { fixtureDIDMetaViewModel, mockUseComDOM, fixtureDIDRulesViewModel, fixtureDIDViewModel, fixtureDIDDatasetReplicasViewModel, fixtureFilereplicaStateViewModel, fixtureFilereplicaStateDViewModel, fixtureDIDKeyValuePairsViewModel } from "test/fixtures/table-fixtures";

export default {
    title: "Components/Pages/DID",
    component: PD,
} as Meta<typeof PD>;

const Template: StoryFn<typeof PD> = (args) => <PD {...args} />;
export const PageDID = Template.bind({});
PageDID.args = {
    didMeta: fixtureDIDMetaViewModel(),
    fromDidList: "yosearch",
    // Parent DIDs [FILE]
    didParentsComDOM: mockUseComDOM(Array.from({length: 100}, (_, i) => fixtureDIDViewModel())),
    // DID Metadata
    didMetadataComDOM: mockUseComDOM(Array.from({ length: 100 }, (_, i) => fixtureDIDKeyValuePairsViewModel())),
    // Filereplicas
    didFileReplicasComDOM: mockUseComDOM(Array.from({ length: 100 }, (_, i) => fixtureFilereplicaStateViewModel())),
    didFileReplicasDComDOM: mockUseComDOM(Array.from({ length: 100 }, (_, i) => fixtureFilereplicaStateDViewModel())),
    didRulesComDOM: mockUseComDOM(Array.from({ length: 100 }, (_, i) => fixtureDIDRulesViewModel())),
    // Contents
    didContentsComDOM: mockUseComDOM(Array.from({ length: 100 }, (_, i) => fixtureDIDViewModel())),
    didDatasetReplicasComDOM: mockUseComDOM(Array.from({ length: 100 }, (_, i) => fixtureDIDDatasetReplicasViewModel()))
}