import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Migration "migration";

import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

(with migration = Migration.run)
actor {
  include MixinStorage();

  // Data Types
  type PageId = Text;
  type Tag = Text;

  // RichText Types
  type RichText = {
    #paragraph : RichTextBlock;
    #heading : HeadingBlock;
    #list : [RichTextListItem];
    #quote : RichTextBlock;
    #code : RichTextBlock;
    #unorderedList : [RichTextListItem];
    #orderedList : [RichTextListItem];
    #image : ImageBlock;
  };

  type RichTextListItem = {
    content : [RichTextSpan];
  };

  type RichTextBlock = {
    content : [RichTextSpan];
  };

  type RichTextSpan = {
    text : Text;
    isBold : Bool;
    isItalic : Bool;
    link : ?Text;
  };

  type ImageBlock = {
    url : Text;
    alt : Text;
  };

  // Specific type for heading level
  type HeadingBlock = {
    content : [RichTextSpan];
    level : HeadingLevel;
  };

  // Heading level enum (h1/h2)
  type HeadingLevel = {
    #h1;
    #h2;
  };

  type PageContent = {
    title : Text;
    subtitle : Text;
    content : [RichText];
    links : [(Text, Text)];
  };

  type WritingPageContent = {
    title : Text;
    subtitle : Text;
  };

  public type Essay = {
    id : Nat;
    title : Text;
    subtitle : Text;
    body : [RichText];
    heroImage : ?Storage.ExternalBlob;
    tags : [Tag];
    publishDate : Time.Time;
    isPublished : Bool;
  };

  public type UserProfile = {
    name : Text;
  };

  // Comparison modules
  module Essay {
    public func compare(essay1 : Essay, essay2 : Essay) : Order.Order {
      Nat.compare(essay1.id, essay2.id);
    };

    public func compareByNewestFirst(essay1 : Essay, essay2 : Essay) : Order.Order {
      Int.compare(essay2.publishDate, essay1.publishDate);
    };
  };

  // Storage
  let pages = Map.empty<PageId, PageContent>();
  let essays = Map.empty<Nat, Essay>();
  let tags = Set.empty<Tag>();
  var nextEssayId = 1;
  let userProfiles = Map.empty<Principal, UserProfile>();

  var writingPageContent : ?WritingPageContent = null;

  // Authorization
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Public API

  // Pages
  public query ({ caller }) func getPageContent(pageId : PageId) : async PageContent {
    switch (pages.get(pageId)) {
      case (null) { Runtime.trap("Page not found") };
      case (?content) { content };
    };
  };

  public query ({ caller }) func getWritingPageContent() : async WritingPageContent {
    switch (writingPageContent) {
      case (null) { Runtime.trap("Writing page content not found") };
      case (?content) { content };
    };
  };

  // Essays
  public query ({ caller }) func listPublishedEssays() : async [Essay] {
    essays.values().toArray().filter(
      func(essay) { essay.isPublished }
    ).sort(Essay.compareByNewestFirst);
  };

  public query ({ caller }) func getPublishedEssay(id : Nat) : async Essay {
    switch (essays.get(id)) {
      case (null) { Runtime.trap("Essay not found") };
      case (?essay) {
        if (not essay.isPublished) {
          Runtime.trap("Essay is not published");
        };
        essay;
      };
    };
  };

  public query ({ caller }) func filterPublishedEssaysByTag(tag : Tag) : async [Essay] {
    essays.values().toArray().filter(
      func(essay) { essay.isPublished and essay.tags.find(func(t) { t == tag }) != null }
    ).sort(Essay.compareByNewestFirst);
  };

  public query ({ caller }) func getAllTags() : async [Tag] {
    tags.toArray();
  };

  // Admin API

  public shared ({ caller }) func updatePageContent(pageId : PageId, content : PageContent) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update pages");
    };
    pages.add(pageId, content);
  };

  public shared ({ caller }) func updateWritingPageContent(content : WritingPageContent) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update writing page");
    };
    writingPageContent := ?content;
  };

  public shared ({ caller }) func createEssay(
    title : Text,
    subtitle : Text,
    body : [RichText],
    heroImage : ?Storage.ExternalBlob,
    tagsInput : [Tag],
    publishDate : Time.Time,
    isPublished : Bool,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create essays");
    };

    let essay : Essay = {
      id = nextEssayId;
      title;
      subtitle;
      body;
      heroImage;
      tags = tagsInput;
      publishDate;
      isPublished;
    };

    essays.add(nextEssayId, essay);
    for (tag in tagsInput.values()) {
      tags.add(tag);
    };

    nextEssayId += 1;
    essay.id;
  };

  public shared ({ caller }) func updateEssay(
    id : Nat,
    title : Text,
    subtitle : Text,
    body : [RichText],
    heroImage : ?Storage.ExternalBlob,
    tagsInput : [Tag],
    publishDate : Time.Time,
    isPublished : Bool,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update essays");
    };

    switch (essays.get(id)) {
      case (null) { Runtime.trap("Essay not found") };
      case (?_) {
        let updatedEssay : Essay = {
          id;
          title;
          subtitle;
          body;
          heroImage;
          tags = tagsInput;
          publishDate;
          isPublished;
        };

        essays.add(id, updatedEssay);
        for (tag in tagsInput.values()) {
          tags.add(tag);
        };
      };
    };
  };

  public shared ({ caller }) func deleteEssay(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete essays");
    };
    if (not essays.containsKey(id)) {
      Runtime.trap("Essay not found");
    };
    essays.remove(id);
  };

  public shared ({ caller }) func uploadImage(image : Storage.ExternalBlob) : async Storage.ExternalBlob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can upload images");
    };
    image;
  };

  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // Admin Functions to Get All Essays (including drafts/unpublished)
  public query ({ caller }) func getAllEssaysForAdmin() : async [Essay] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all essays");
    };
    essays.values().toArray().sort(Essay.compareByNewestFirst);
  };

  public query ({ caller }) func getEssayForAdmin(id : Nat) : async Essay {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view essays");
    };
    switch (essays.get(id)) {
      case (null) { Runtime.trap("Essay not found") };
      case (?essay) { essay };
    };
  };

  // Initial Data Setup (optional)
  public shared ({ caller }) func initializeDefaultPages() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can initialize pages");
    };

    let homeContent : PageContent = {
      title = "Welcome to Tomwm";
      subtitle = "A minimal personal website";
      content = [
        #heading {
          content = [
            { text = "Welcome to Tomwm"; isBold = false; isItalic = false; link = null }
          ];
          level = #h1;
        },
        #paragraph {
          content = [
            {
              text = "This is a minimal personal website optimized for reading and writing.";
              isBold = false;
              isItalic = false;
              link = null;
            },
          ];
        },
      ];
      links = [];
    };

    let aboutContent : PageContent = {
      title = "About";
      subtitle = "Learn more about Tomwm";
      content = [
        #heading {
          content = [
            { text = "About Tomwm"; isBold = false; isItalic = false; link = null }
          ];
          level = #h1;
        },
        #paragraph {
          content = [
            {
              text = "Tomwm is a personal website platform focused on writing and reading.";
              isBold = false;
              isItalic = false;
              link = null;
            },
          ];
        },
      ];
      links = [];
    };

    let contactContent : PageContent = {
      title = "Contact";
      subtitle = "Get in touch";
      content = [
        #heading {
          content = [
            { text = "Contact"; isBold = false; isItalic = false; link = null }
          ];
          level = #h1;
        },
        #paragraph {
          content = [
            {
              text = "Feel free to reach out using the links below.";
              isBold = false;
              isItalic = false;
              link = null;
            },
          ];
        },
      ];
      links = [
        ("Email", "mailto:example@example.com"),
        ("Twitter", "https://twitter.com/example"),
      ];
    };

    let writingContent : WritingPageContent = {
      title = "Writing";
      subtitle = "Explore my essays and articles";
    };

    pages.add("home", homeContent);
    pages.add("about", aboutContent);
    pages.add("contact", contactContent);
    writingPageContent := ?writingContent;
  };
};
