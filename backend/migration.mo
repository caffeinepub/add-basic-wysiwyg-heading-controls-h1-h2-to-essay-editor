import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import Array "mo:core/Array";

module {
  type Tag = Text;

  // Old types
  type OldActor = {
    pages : Map.Map<Text, OldPageContent>;
    essays : Map.Map<Nat, OldEssay>;
    tags : Set.Set<Tag>;
    nextEssayId : Nat;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    writingPageContent : ?OldWritingPageContent;
  };

  type OldPageContent = {
    title : Text;
    subtitle : Text;
    content : [OldRichText];
    links : [(Text, Text)];
  };

  type OldWritingPageContent = {
    title : Text;
    subtitle : Text;
  };

  type OldEssay = {
    id : Nat;
    title : Text;
    subtitle : Text;
    body : [OldRichText];
    heroImage : ?Storage.ExternalBlob;
    tags : [Tag];
    publishDate : Time.Time;
    isPublished : Bool;
  };

  type OldUserProfile = {
    name : Text;
  };

  type OldRichText = {
    #paragraph : OldRichTextBlock;
    #heading : OldRichTextBlock;
    #list : [OldRichTextListItem];
    #quote : OldRichTextBlock;
    #code : OldRichTextBlock;
    #unorderedList : [OldRichTextListItem];
    #orderedList : [OldRichTextListItem];
    #image : OldImageBlock;
  };

  type OldRichTextListItem = {
    content : [OldRichTextSpan];
  };

  type OldRichTextBlock = {
    content : [OldRichTextSpan];
  };

  type OldRichTextSpan = {
    text : Text;
    isBold : Bool;
    isItalic : Bool;
    link : ?Text;
  };

  type OldImageBlock = {
    url : Text;
    alt : Text;
  };

  // New types
  type NewActor = {
    pages : Map.Map<Text, NewPageContent>;
    essays : Map.Map<Nat, NewEssay>;
    tags : Set.Set<Tag>;
    nextEssayId : Nat;
    userProfiles : Map.Map<Principal, NewUserProfile>;
    writingPageContent : ?NewWritingPageContent;
  };

  type NewPageContent = {
    title : Text;
    subtitle : Text;
    content : [NewRichText];
    links : [(Text, Text)];
  };

  type NewWritingPageContent = {
    title : Text;
    subtitle : Text;
  };

  type NewEssay = {
    id : Nat;
    title : Text;
    subtitle : Text;
    body : [NewRichText];
    heroImage : ?Storage.ExternalBlob;
    tags : [Tag];
    publishDate : Time.Time;
    isPublished : Bool;
  };

  type NewUserProfile = {
    name : Text;
  };

  type NewRichText = {
    #paragraph : NewRichTextBlock;
    #heading : NewHeadingBlock;
    #list : [NewRichTextListItem];
    #quote : NewRichTextBlock;
    #code : NewRichTextBlock;
    #unorderedList : [NewRichTextListItem];
    #orderedList : [NewRichTextListItem];
    #image : NewImageBlock;
  };

  type NewRichTextListItem = {
    content : [NewRichTextSpan];
  };

  type NewRichTextBlock = {
    content : [NewRichTextSpan];
  };

  type NewRichTextSpan = {
    text : Text;
    isBold : Bool;
    isItalic : Bool;
    link : ?Text;
  };

  type NewImageBlock = {
    url : Text;
    alt : Text;
  };

  type NewHeadingBlock = {
    content : [NewRichTextSpan];
    level : NewHeadingLevel;
  };

  type NewHeadingLevel = {
    #h1;
    #h2;
  };

  public func run(old : OldActor) : NewActor {
    let migratedPages = old.pages.map<Text, OldPageContent, NewPageContent>(
      func(_id, oldContent) {
        {
          oldContent with
          content = oldContent.content.map(migrateRichText);
        };
      }
    );

    let migratedEssays = old.essays.map<Nat, OldEssay, NewEssay>(
      func(_id, oldEssay) {
        {
          oldEssay with
          body = oldEssay.body.map(migrateRichText);
        };
      }
    );

    {
      old with
      pages = migratedPages;
      essays = migratedEssays;
    };
  };

  func migrateRichText(old : OldRichText) : NewRichText {
    switch (old) {
      case (#paragraph(block)) { #paragraph(block) };
      case (#heading(block)) {
        #heading({
          content = block.content.map(func(span) { span });
          level = #h1;
        });
      };
      case (#list(items)) { #list(items) };
      case (#quote(block)) { #quote({ block with content = block.content }) };
      case (#code(block)) { #code({ block with content = block.content }) };
      case (#unorderedList(items)) { #unorderedList(items) };
      case (#orderedList(items)) { #orderedList(items) };
      case (#image(img)) { #image({ img with url = img.url; alt = img.alt }) };
    };
  };
};
